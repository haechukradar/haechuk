// Claude Haiku 기반 한국어 요약·엔티티 태깅·이적 단계 분류·이슈 키 부여
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { CLUBS, CLUB_BY_SLUG } from '../../config/clubs.mjs';
import { SOURCE_BY_ID, isOwnSource } from '../../config/sources.mjs';
import { PIPELINE } from '../../config/site.mjs';
import { PLAYERS } from '../../config/players.mjs';
import { fixNames, NAME_HINTS, NAMES, nameKey } from '../../config/names.mjs';

// 원문 이름 → 사전 한글 표기 (선수 사전 + 인명 표기 사전)
const DICT = new Map();
for (const p of PLAYERS) for (const en of p.full) DICT.set(nameKey(en), p.ko);
// 성·애칭만 쓴 경우도 대조 (다른 선수와 겹치는 성은 제외)
const surnameCount = new Map();
for (const p of PLAYERS) for (const en of [...p.short, p.full[0].split(' ').at(-1)]) surnameCount.set(nameKey(en), (surnameCount.get(nameKey(en)) ?? 0) + 1);
for (const p of PLAYERS)
  for (const en of [...p.short, p.full[0].split(' ').at(-1)]) {
    const k = nameKey(en);
    if (k.length >= 4 && surnameCount.get(k) === 1 && !DICT.has(k)) DICT.set(k, p.ko);
  }
for (const n of NAMES) for (const en of n.en) DICT.set(nameKey(en), n.ko);
const dictName = (en) => (en ? DICT.get(nameKey(en)) ?? null : null);
// 성만 쓴 표기는 같은 사람으로 봄 ("킬리안 음바페" ↔ "음바페")
const sameName = (a, b) => a === b || a.endsWith(' ' + b) || b.endsWith(' ' + a);

// 선수 사전의 한글 표기와 현재 소속 (요청마다 같은 내용 — 이름 표기 통일 + 이적 출발지·지난 이적 판단용)
const PLAYER_NAMES = [PLAYERS.map((p) => `${p.full[0]}=${p.ko}(${CLUB_BY_SLUG[p.club]?.ko ?? p.team})`).join(', '), NAME_HINTS].join(', ');

// 한글 이름(전체·성) → 선수 사전 항목
const PLAYER_BY_KO = new Map();
for (const p of PLAYERS) {
  PLAYER_BY_KO.set(p.ko, p);
  const last = p.ko.split(' ').at(-1);
  if (last !== p.ko && !PLAYER_BY_KO.has(last)) PLAYER_BY_KO.set(last, p);
}
const squashKo = (s) => (s ?? '').replace(/\s+/g, '');
// 클럽 한글명이 같은 클럽인지 (맨시티 ↔ 맨체스터 시티 같은 약칭은 앞부분 포함으로)
const sameClubKo = (a, b) => {
  const x = squashKo(a), y = squashKo(b);
  return !!x && !!y && (x === y || x.startsWith(y) || y.startsWith(x));
};

const CLUB_SLUGS = CLUBS.map((c) => c.slug);

const ItemSchema = z.object({
  i: z.number().int(),
  is_football: z.boolean().describe('축구 기사 여부'),
  is_new_development: z.boolean().describe('이번 보도가 새로운 소식·진전이면 true, 지난 일의 회고·평가·후일담·의견이면 false'),
  ko: z.string().describe('한국어 한 줄 요약 (제목에 드러난 정보만)'),
  // enum 대신 문자열로 받고 코드에서 정규화 (값 하나가 어긋나도 배치 전체가 실패하지 않도록)
  category: z.string().describe('transfer | match | injury | manager | other'),
  stage: z.string().nullable().describe('interest | negotiation | agreement | done | collapsed | null'),
  clubs: z.array(z.string()).describe('주어진 클럽 slug 목록 중에서만'),
  other_clubs: z.array(z.string()),
  players: z.array(z.string()).describe('선수 이름 (한국어 표기)'),
  managers: z.array(z.string()).describe('감독 이름 (한국어 표기)'),
  league: z.string().nullable().describe('epl | laliga | seriea | bundesliga | ligue1 | other | null'),
  credited: z.string().nullable().describe('제목이 인용한 원 보도 출처 (예: 디 애슬레틱, 파브리치오 로마노(X)) 없으면 null'),
  issue_key: z.string().nullable(),
  issue_title_ko: z.string().nullable(),
  transfer_player: z.string().nullable().describe('이적 기사일 때 이적 대상 선수 (한국어 표기)'),
  transfer_from: z.string().nullable().describe('이적 기사일 때 현 소속 클럽 (한국어 표기, 확인 불가 시 null)'),
  transfer_to: z.string().nullable().describe('이적 기사일 때 행선지 클럽 (한국어 표기, 확인 불가 시 null)'),
  name_map: z
    .array(z.object({ en: z.string(), ko: z.string() }))
    .describe('제목에 나온 인명(선수·감독·구단 인사)의 원문 표기와 ko에 쓴 한국어 표기'),
});
const BatchSchema = z.object({ items: z.array(ItemSchema) });

const SYSTEM = `너는 해외축구 뉴스 편집 보조다. 해외 매체 기사 "제목"만 보고 아래 작업을 한다.

가장 중요한 규칙 — 제목에 없는 사실은 절대 쓰지 않는다:
- 추측·배경지식·맥락으로 보충하지 않는다. 제목이 질문이면 요약도 질문·전망 형태로 둔다.
- 제목의 동사·사실 관계를 바꾸지 않는다. "합의·확정·결렬·경질·부상" 같은 표현은 제목에 그 뜻이 있을 때만 쓴다 (예: "leaves after contract dispute" → "계약 분쟁 끝에 팀 떠나", "계약 해지 합의"는 틀림).
- 숫자·금액·날짜는 계산·환산하지 않고 원래 값을 그대로 옮긴다 (예: £107m → 1억 700만 파운드, €45m → 4500만 유로, $669 → 669달러).
- 제목의 핵심 인물·대상을 빠뜨리지 않는다.
- 인명은 국내 축구 언론 통용 표기로 통일한다. 아래 "인명 표기" 목록에 있는 사람은 반드시 그 표기를 쓴다(성만 쓸 때도 그 표기의 성 부분). 감독 예: Carrick→캐릭, Arteta→아르테타, Maresca→마레스카, Slot→슬롯, Guardiola→과르디올라, Amorim→아모림, Howe→하우, Ratcliffe→래트클리프.

각 기사에 대해:
- 여러 소식을 이어 붙인 제목(예: "Liverpool latest: A tipped for return as transfer exit draws closer", "X news: ... as ...")은 절마다 주어를 따로 본다. 이적 단계·이적 대상은 그 이적 절이 가리키는 선수에게만 붙인다. 이적 절의 대상이 이름 없이 "star", "defender", "ace" 등으로만 나오면 transfer_player 는 null 이고, 다른 절에 이름이 나온 선수에게 그 이적을 붙이지 않는다. 요약(ko)에서도 두 소식을 섞지 않는다.
  예: "Liverpool news: Trent Alexander-Arnold gets new green light as star's transfer 'expected'" → ko "알렉산더아놀드 복귀 청신호…리버풀 한 선수 이적 '예상'", 알렉산더아놀드는 이적 대상이 아니므로 transfer_player=null, 이 기사의 이적은 대상 미상.
  예: "Liverpool latest: Trent Alexander-Arnold backed for Anfield return as transfer exit draws closer" → ko "알렉산더아놀드 안필드 복귀 지지…리버풀 한 선수 이적 임박", 이적 임박은 알렉산더아놀드가 아님.
- 이미 끝난 이적을 배경으로 언급하는 제목(예: "after X completion", "following X's exit", "X 이후")은 X 의 이적 기사가 아니다. 그 뒤에 오는 다른 문제(구단의 다른 이적·전력 공백 등)가 기사의 주제다.
- 인명 표기 목록의 괄호 안은 선수의 현재 소속이다. 이적의 transfer_from 은 현재 소속이다. 현재 소속 클럽으로 가는 이적은 이미 끝난 이적이므로 새 이적 기사가 아니다(친정 복귀설처럼 현재 소속을 떠나는 이적과 구별).
- is_new_development: 이 기사가 "새로 일어난 일·새 진전"을 전하면 true. 이미 지난 일(지난 이적시장, 지난 시즌, 이미 끝난 이적)을 돌아보는 회고·평가·후일담·인터뷰 속 과거 이야기·해설가 의견이면 false. 예: "트로사르가 베식타스 이적 과정을 설명" → false, "퍼디난드가 맨유가 여름에 놓친 선수를 아쉬워함" → false, "첼시가 ○○와 개인 합의" → true.
- is_football: 축구 기사면 true. F1·테니스·크리켓·럭비 등 다른 종목이나 축구와 무관한 기사면 false.
- ko: 한국어 한 줄 요약. 45자 안팎, 뉴스 제목체. 인명·클럽명은 국내 통용 표기(예: Son Heung-min→손흥민, Man Utd→맨유, Tottenham→토트넘, Real Madrid→레알 마드리드).
- category: transfer(이적·재계약·임대), match(경기 결과·프리뷰·평점), injury(부상), manager(감독 선임·경질·발언), other.
  transfer는 지금 진행 중인 이적설이거나 이번에 새로 확정·결렬된 이적만이다. 이적과 관련된 벌금·징계·제소·조사 같은 행정 처분은 transfer가 아니라 other이고 issue_key는 "<클럽>-affairs-<주제>" 형식을 쓴다. 이미 끝난 이적의 평가·회고·적응기·성과·"영입이 성공적" 같은 기사는 transfer가 아니라 other이고, stage·transfer_* 는 null, issue_key 도 이적 형식을 쓰지 않는다.
- stage: 이적 기사일 때만. interest(관심·주시), negotiation(협상·제안·입찰), agreement(구두/개인 합의·메디컬 예정), done(공식 발표·"Here we go"·서명 완료), collapsed(결렬·철회 — 제목에 거래 자체가 무산·철회됐다고 나올 때만). 이적 기사가 아니면 null.
- clubs: 제목에 등장하는 클럽 중 주어진 slug 목록에 있는 것. 목록에 없는 클럽은 other_clubs에 영어 이름으로.
- players / managers: 제목에 등장하는 선수·감독 이름(한국어 표기).
- league: 기사의 주 리그. 판단 불가 시 null.
- credited: 제목 안에 "다른" 매체·기자가 "보도의 출처"로 명시된 경우에만. 해설가·전 선수·방송인의 의견(예: 피어스 모건, 리오 퍼디낸드)이나 광고·베팅 업체는 출처가 아니다. 그 출처(한국어 표기, X 게시물은 "(X)" 붙임). 예: "Romano: ..." → 파브리치오 로마노(X), "according to The Athletic" → 디 애슬레틱. 기사를 낸 매체 자신([매체/언어]에 적힌 매체)은 credited가 아니다. 대부분의 기사는 null이다.
- issue_key: 같은 "사건"을 다룬 기사끼리 묶기 위한 영어 소문자 slug. 제목의 정보와 축구 배경지식으로 어떤 사건인지 판단하고, 아래 유형 중 하나의 형식만 쓴다.
    · 이적: "<선수성>-<행선지클럽>-transfer" (행선지가 여럿이면 가장 유력한 곳)
    · 재계약: "<선수성>-contract"
    · 감독 거취(경질·유임 여부·후임 후보): "<클럽>-manager-future"
    · 감독 선임 확정: "<감독성>-<클럽>-appointment"
    · 부상: "<선수성>-injury"
    · 징계·퇴장·항소: "<선수성>-discipline"
    · 인물 간 갈등·관계(감독-선수, 선수-구단 등): "<인물A성>-<인물B성>-relationship"
    · 경기: "<홈클럽>-<원정클럽>-<YYYY-MM-DD>"
    · 구단 운영·재정·징계 절차·구단주: "<클럽>-affairs-<주제>" (예: man-city-affairs-charges)
    · 수상·기록: "<선수성>-<상이름>-award"
    · 사고·사건(사망·부상 외 사고·폭력·경기장 사고·재해로 인한 경기 연기 등): "<주제>-incident"
  단위는 "발언 하나"가 아니라 "사건 하나"다. 같은 사건의 후속 보도·반응·인터뷰는 같은 key로 묶는다. 예: 맨유가 에디 하우를 후임으로 검토 → man-utd-manager-future, 캐릭과 페르난데스의 면담 → carrick-fernandes-relationship.
  아래 "기존 이슈" 중 같은 사건이 있으면 반드시 그 key를 그대로 재사용한다. 라이브 블로그·가십 모음·칼럼·인터뷰 위주 기사·퀴즈처럼 단일 사건이 아니거나 위 유형에 맞지 않으면 null.
- issue_title_ko: 이 이슈를 대표하는 한국어 제목(30자 안팎, 위 규칙 동일). issue_key가 null이면 null.
- name_map: 제목에 나온 인명마다 {en: 제목의 원문 표기, ko: 요약에 쓴 한국어 표기}. 인명이 없으면 빈 배열.
- transfer_player / transfer_from / transfer_to: 이적 기사일 때 대상 선수, 현 소속 클럽, 행선지 클럽(한국어 표기). 제목에서 확인되지 않으면 null. 이적 기사가 아니면 모두 null.

입력 순서와 i 값을 그대로 유지해 모든 기사에 대해 결과를 낸다.`;

const CATEGORIES = new Set(['transfer', 'match', 'injury', 'manager', 'other']);
const STAGES = new Set(['interest', 'negotiation', 'agreement', 'done', 'collapsed']);
const LEAGUES = new Set(['epl', 'laliga', 'seriea', 'bundesliga', 'ligue1', 'other']);
const SLUGS = new Set(CLUB_SLUGS);

function normalize(raw, sourceId) {
  // 저장 직전 인명 오표기 교정 (표기 사전 config/names.mjs)
  const item = {
    ...raw,
    ko: fixNames(raw.ko),
    issue_title_ko: fixNames(raw.issue_title_ko),
    players: (raw.players ?? []).map(fixNames),
    managers: (raw.managers ?? []).map(fixNames),
    transfer_player: fixNames(raw.transfer_player),
    name_map: (raw.name_map ?? []).map((n) => ({ en: n.en, ko: fixNames(n.ko) })),
  };
  // 지난 일의 회고·평가는 이적 진전이 아님 → 이적 분류·단계·이적 이슈 키 제거
  const retro = raw.is_new_development === false;
  if (retro && item.category === 'transfer') {
    item.category = 'other';
    item.stage = null;
    item.transfer_player = item.transfer_from = item.transfer_to = null;
    if (/-transfer$/.test(String(item.issue_key ?? ''))) item.issue_key = item.issue_title_ko = null;
  }
  // 선수 사전의 현재 소속으로 이적 방향 점검: 이미 그 클럽 소속이면 지난 이적, 출발지가 다르면 현재 소속으로 교정
  const known = PLAYER_BY_KO.get(item.transfer_player);
  const current = known && CLUB_BY_SLUG[known.club]?.ko;
  if (item.category === 'transfer' && current) {
    if (sameClubKo(item.transfer_to, current)) {
      item.category = 'other';
      item.stage = null;
      item.transfer_player = item.transfer_from = item.transfer_to = null;
      if (/-transfer$/.test(String(item.issue_key ?? ''))) item.issue_key = item.issue_title_ko = null;
    } else if (item.transfer_from && !sameClubKo(item.transfer_from, current)) {
      item.transfer_from = current;
    }
  }
  // 사전에 있는 사람이 다르게 표기됐으면 사전 표기로 바꿈 (예: 사리바 → 살리바)
  for (const n of item.name_map) {
    const right = dictName(n.en);
    if (!right || !n.ko || sameName(n.ko, right)) continue;
    const to = n.ko.includes(' ') ? right : right.split(' ').at(-1);
    item.ko = item.ko?.split(n.ko).join(to);
    item.issue_title_ko = item.issue_title_ko?.split(n.ko).join(to);
    // 선수·감독 목록(퀴즈 주인공 이름 등에 쓰임)도 같은 표기로
    item.players = item.players.map((x) => (x === n.ko ? to : x));
    item.managers = item.managers.map((x) => (x === n.ko ? to : x));
    if (item.transfer_player === n.ko) item.transfer_player = to;
    n.ko = to;
  }
  const category = CATEGORIES.has(item.category) ? item.category : 'other';
  return {
    ...item,
    category,
    stage: category === 'transfer' ? (STAGES.has(item.stage) ? item.stage : 'interest') : null,
    clubs: item.clubs.filter((c) => SLUGS.has(c)),
    other_clubs: [...item.other_clubs, ...item.clubs.filter((c) => !SLUGS.has(c))],
    league: LEAGUES.has(item.league) ? item.league : null,
    // 기사를 낸 매체 자신을 인용 출처로 넣은 경우 제거
    credited: item.credited && !isOwnSource(sourceId, item.credited) ? item.credited : null,
    is_football: item.is_football !== false,
    issue_key: validIssueKey(item.issue_key) ? item.issue_key.trim().toLowerCase() : null,
    issue_title_ko: validIssueKey(item.issue_key) ? item.issue_title_ko : null,
    transfer:
      category === 'transfer' && item.transfer_player
        ? { player: item.transfer_player, from: item.transfer_from ?? null, to: item.transfer_to ?? null }
        : null,
  };
}

// 이슈 키 형식 (지시문의 사건 유형 목록과 같은 규칙). 형식 밖의 키는 묶지 않는다
const ISSUE_KEY_RE = /^[a-z0-9]+(-[a-z0-9]+)*-(transfer|contract|manager-future|appointment|injury|discipline|relationship|award|incident|affairs-[a-z0-9-]+|\d{4}-\d{2}-\d{2})$/;
export const validIssueKey = (key) => typeof key === 'string' && ISSUE_KEY_RE.test(key.trim().toLowerCase());

// 지시문 버전: 지시문을 고치면 올린다. --reenrich 는 이전 버전으로 가공된 기사만 다시 가공
export const PROMPT_VERSION = 7;

let client;
// 이번 실행의 API 오류 (meta.json 의 llmErrors 로 남겨 원인 확인)
export const llmErrors = [];
let disabled = false;

export const llmAvailable = () => !disabled && process.env.NO_LLM !== '1';

/**
 * @param {Array<{id,title,source,publishedAt}>} articles
 * @param {Array<{slug,titleKo}>} activeIssues 재사용 후보 이슈
 * @returns {Map<string, object>} article id -> enrichment
 */
export async function enrichBatch(articles, activeIssues) {
  const res = await requestBatch(articles, activeIssues);
  if (res !== TRUNCATED) return res;
  // 응답이 출력 한도에서 잘림 → 반으로 나눠 재요청, 더 못 나누면 그 기사들은 규칙 기반으로 남김
  if (articles.length <= 5) {
    console.warn(`  응답 잘림: ${articles.length}건은 규칙 기반으로 처리`);
    return new Map();
  }
  const mid = Math.ceil(articles.length / 2);
  console.warn(`  응답 잘림: ${articles.length}건을 ${mid}건씩 나눠 다시 요청`);
  const a = await enrichBatch(articles.slice(0, mid), activeIssues);
  const b = await enrichBatch(articles.slice(mid), activeIssues);
  return new Map([...a, ...b]);
}

const TRUNCATED = Symbol('truncated');

async function requestBatch(articles, activeIssues) {
  // 일시적 오류(과부하·속도 제한·네트워크)는 SDK가 지수 대기로 재시도
  client ??= new Anthropic({ maxRetries: 5 });
  const lines = articles.map((a, i) => {
    const s = SOURCE_BY_ID[a.source];
    // RSS description은 보내지 않는다 (요약에 제목 밖 내용이 섞이는 문제 확인 — 선수 매칭에만 사용)
    return `${i}\t[${s?.name ?? a.source} / ${s?.lang ?? 'en'}] ${a.title}`;
  });
  const issues = activeIssues.slice(0, 150).map((x) => `${x.slug}\t${x.titleKo}`).join('\n') || '(없음)';
  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await client.messages.parse({
      model: PIPELINE.model,
      max_tokens: 16000,
      system: SYSTEM,
      // 단순 분류·요약이라 생각 과정은 끔 (출력 한도·비용 절약, Haiku 5.5는 effort high 이하에서 허용)
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: zodOutputFormat(BatchSchema) },
      messages: [
        {
          role: 'user',
          content: `오늘 날짜(UTC): ${today}\n클럽 slug 목록: ${CLUB_SLUGS.join(', ')}\n인명 표기: ${PLAYER_NAMES}\n\n기존 이슈(key\\t제목):\n${issues}\n\n기사 목록(i\\t[매체/언어] 제목):\n${lines.join('\n')}`,
        },
      ],
    });
    if (res.stop_reason === 'max_tokens') return TRUNCATED;
    if (res.stop_reason === 'refusal' || !res.parsed_output) {
      console.warn(`  LLM 결과 없음 (stop_reason=${res.stop_reason})`);
      return new Map();
    }
    const out = new Map();
    for (const item of res.parsed_output.items) {
      const a = articles[item.i];
      if (a) out.set(a.id, normalize(item, a.source));
    }
    return out;
  } catch (err) {
    llmErrors.push({ at: new Date().toISOString(), status: err?.status ?? null, message: String(err?.message ?? err).slice(0, 200) });
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.warn('  Claude API 인증 실패 → 이번 실행은 규칙 기반으로 처리');
      disabled = true;
    } else if (err instanceof Anthropic.APIError) {
      console.warn(`  Claude API 오류(${err.status ?? 'network'}): ${err.message}`);
    } else if (/parse structured output|Unterminated|Unexpected end of JSON/i.test(String(err?.message))) {
      // 출력이 잘려 JSON이 불완전한 경우 (SDK가 파싱 단계에서 오류를 던짐)
      return TRUNCATED;
    } else if (/api key|apiKey|authToken|credentials/i.test(String(err?.message))) {
      console.warn('  Claude API 자격 증명 없음 → 규칙 기반으로 처리');
      disabled = true;
    } else {
      // 알 수 없는 오류도 수집 전체를 멈추지 않고 이 배치만 규칙 기반으로 남김
      console.warn(`  Claude 처리 오류: ${err?.message ?? err}`);
    }
    return new Map();
  }
}
