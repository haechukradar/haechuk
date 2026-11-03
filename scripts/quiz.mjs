// 주간 뉴스 퀴즈 출제 — 최근 7일 수집 기록(언급 횟수·이슈 규모·확정 이적·부상·징계·감독 거취·이적설·수상)과 확인된 선수 소속에서만 문제를 만든다.
// "어느 매체가 먼저 보도했나" 같은 사이트 내부 정보가 아니라, 그 주에 무슨 일이 있었는지를 묻는다.
// LLM이 사실을 지어내지 않도록 정답은 모두 데이터에서 계산. 주(월요일 시작, KST)마다 1회 생성.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GAME } from '../config/game.mjs';
import { KOREAN_PLAYERS, PLAYER_BY_SLUG, PLAYERS } from '../config/players.mjs';
import { CLUBS } from '../config/clubs.mjs';

const DATA = path.resolve('data');
const QUIZ_DIR = path.join(DATA, 'quiz');
const H = 3600_000;
const D = 24 * H;

const readJson = async (f, fb) => {
  try {
    return JSON.parse(await readFile(f, 'utf8'));
  } catch {
    return fb;
  }
};

// KST 기준 이번 주 월요일 날짜 = 퀴즈 id
export function weekId(now = Date.now()) {
  const k = new Date(now + 9 * H);
  const dow = (k.getUTCDay() + 6) % 7; // 월=0
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - dow)).toISOString().slice(0, 10);
}

// 퀴즈 id로 고정되는 난수 (재실행해도 같은 보기 순서)
function rng(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function buildQuiz({ issues, articles, now = Date.now(), id = weekId(now) }) {
  const rand = rng(id);
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = (arr, n) => shuffle(arr).slice(0, n);
  const uniqueBy = (arr) => [...new Set(arr)];
  const since = now - 7 * D;
  const questions = [];
  // 보기 4개(정답 1 + 오답 3)를 섞어 문제 추가. 오답이 3개 미만이면 출제하지 않음
  const usedAnswers = new Set(); // 한 퀴즈 안에서 같은 정답 반복 방지
  const add = (q, answer, wrongPool, explain, link = null) => {
    if (!answer || usedAnswers.has(answer)) return false;
    const wrongs = pick(uniqueBy(wrongPool.filter((w) => w && w !== answer)), 3);
    if (wrongs.length < 3) return false;
    const options = shuffle([answer, ...wrongs]);
    questions.push({ q, options, answer: options.indexOf(answer), explain, link });
    usedAnswers.add(answer);
    return true;
  };

  const recent = articles.filter((a) => !a.offTopic && Date.parse(a.publishedAt) >= since);
  const recentIssues = issues.filter((i) => Date.parse(i.updatedAt) >= since);
  const title = (i) => i.titleKo || i.headline;

  // 1) 최근 7일 가장 많이 언급된 선수
  const counts = {};
  for (const a of recent) for (const p of a.playerTags ?? []) counts[p] = (counts[p] ?? 0) + 1;
  const ranked = Object.entries(counts).sort((x, y) => y[1] - x[1]);
  if (ranked.length >= 4 && ranked[0][1] >= 3 && ranked[0][1] > ranked[1][1]) {
    const [top, n] = ranked[0];
    add(
      '최근 7일 동안 해외 매체 기사 제목에 가장 많이 등장한 선수는?',
      PLAYER_BY_SLUG[top].ko,
      ranked.slice(1, 12).map(([s]) => PLAYER_BY_SLUG[s]?.ko),
      `${PLAYER_BY_SLUG[top].ko} 선수가 ${n}건으로 가장 많았어요. (2위 ${PLAYER_BY_SLUG[ranked[1][0]].ko} ${ranked[1][1]}건)`,
      `/player/${top}`,
    );
  }

  // 2) 가장 많은 매체가 동시에 다룬 이슈
  const big = [...recentIssues].filter((i) => i.sourceCount >= 2).sort((a, b) => b.sourceCount - a.sourceCount);
  if (big.length >= 4 && big[0].sourceCount > big[1].sourceCount) {
    add(
      '최근 7일 동안 가장 많은 해외 매체가 다룬 이슈는?',
      title(big[0]),
      big.slice(1, 10).map(title),
      `${big[0].sourceCount}개 매체가 보도했어요.`,
      `/issue/${big[0].slug}`,
    );
  }

  // 3) 확정된 이적의 행선지 (1~2티어 매체 기준으로 종료 판정된 이슈만)
  const clubNames = CLUBS.map((c) => c.ko);
  for (const i of recentIssues.filter((x) => x.sourceCount >= 2 && x.resolution?.result === 'done' && !x.resolution.inferred && x.transfer?.player && x.transfer?.to).slice(0, 2)) {
    add(
      `이번 주 ${i.transfer.player}의 이적이 확정됐다. 행선지는?`,
      i.transfer.to,
      clubNames.filter((c) => c !== i.transfer.from),
      `${i.transfer.from ? `${i.transfer.from} → ` : ''}${i.transfer.to}. 첫 보도 후 ${Math.max(1, Math.round(i.resolution.durationDays))}일 만에 확정됐어요.`,
      `/issue/${i.slug}`,
    );
  }

  // 5) 코리안리거 소속 (소속을 확인한 한국인 선수만)
  for (const p of pick(KOREAN_PLAYERS, 2)) {
    add(
      `${p.ko} 선수의 현재 소속팀은?`,
      p.team.replace(/\s*\(.+\)$/, ''),
      KOREAN_PLAYERS.filter((x) => x.slug !== p.slug).map((x) => x.team.replace(/\s*\(.+\)$/, '')),
      `${p.team} 소속이에요. (2026-27 시즌 기준)`,
      `/player/${p.slug}`,
    );
  }

  // ── 이번 주 사건 문제 (Claude가 분류한 사건 유형 기준, 2개 이상 매체가 다룬 이슈만) ──
  const kind = (i) => i.slug.replace(/-\d{8}$/, '');
  const ofType = (suffix) => big.filter((i) => kind(i).endsWith(suffix));
  // 이슈의 주인공: 기사들에 가장 많이 나온 인물 (선수 또는 감독)
  const subjectOf = (i, field = 'players') => {
    const c = {};
    for (const a of i.articles) for (const n of a[field] ?? []) c[n] = (c[n] ?? 0) + 1;
    const top = Object.entries(c).sort((x, y) => y[1] - x[1]);
    return top.length && (top.length === 1 || top[0][1] > top[1][1]) ? top[0][0] : null;
  };
  // 오답 후보: 이번 주 기사에 많이 나온 다른 선수들
  const nameCounts = {};
  for (const a of recent) for (const n of a.players ?? []) nameCounts[n] = (nameCounts[n] ?? 0) + 1;
  const popularNames = Object.entries(nameCounts).sort((x, y) => y[1] - x[1]).map(([n]) => n);
  const othersThan = (answer, pool) => pool.filter((n) => n !== answer && !n.endsWith(' ' + answer) && !answer.endsWith(' ' + n));
  const article = (i) => `‘${title(i)}’`;

  // 4) 부상 소식의 주인공
  for (const i of ofType('-injury').slice(0, 1)) {
    const who = subjectOf(i);
    if (who) add('이번 주 부상 소식이 여러 매체에 보도된 선수는?', who, othersThan(who, popularNames).slice(0, 15), `${article(i)} — ${i.sourceCount}개 매체가 다뤘어요.`, `/issue/${i.slug}`);
  }

  // 5) 퇴장·징계 논란의 주인공
  for (const i of ofType('-discipline').slice(0, 1)) {
    const who = subjectOf(i);
    if (who) add('이번 주 퇴장·징계 논란으로 화제가 된 선수는?', who, othersThan(who, popularNames).slice(0, 15), `${article(i)} — ${i.sourceCount}개 매체가 다뤘어요.`, `/issue/${i.slug}`);
  }

  // 6) 감독 거취 보도가 가장 많았던 클럽
  const mf = ofType('-manager-future');
  if (mf.length) {
    const i = mf[0];
    const club = CLUBS.find((c) => kind(i).replace(/-manager-future$/, '').endsWith(c.slug));
    if (club)
      add(
        '이번 주 감독 거취(경질·후임) 보도가 가장 많았던 클럽은?',
        club.ko,
        CLUBS.filter((c) => c.page && c.slug !== club.slug).map((c) => c.ko),
        `${article(i)} — ${i.sourceCount}개 매체가 다뤘어요.`,
        `/issue/${i.slug}`,
      );
  }

  // 7) 진행 중인 이적설의 행선지 (종료 전, 행선지가 확인된 이슈)
  for (const i of ofType('-transfer').filter((x) => !x.resolution && ['interest', 'negotiation', 'agreement'].includes(x.stage) && x.transfer?.player && x.transfer?.to).slice(0, 1)) {
    add(
      `이번 주 ${i.transfer.player}의 이적설에서 거론된 행선지는?`,
      i.transfer.to,
      CLUBS.map((c) => c.ko).filter((c) => c !== i.transfer.from && c.replace(/\s/g, '') !== i.transfer.to.replace(/\s/g, '')),
      `${article(i)} — 현재 단계: ${{ interest: '관심', negotiation: '협상', agreement: '합의', done: '확정', collapsed: '결렬' }[i.stage] ?? '관심'}, ${i.sourceCount}개 매체 보도.`,
      `/issue/${i.slug}`,
    );
  }

  // 8) 수상·기록 소식의 주인공 (상 이름을 아는 경우만)
  const AWARDS = { 'ballon-dor': '발롱도르', 'golden-boy': '골든보이', 'golden-boot': '골든부트', 'kopa': '코파 트로피', 'yashin': '야신 트로피', 'fifa-best': 'FIFA 올해의 선수', 'player-of-the-month': '이달의 선수', 'player-of-the-year': '올해의 선수' };
  for (const i of ofType('-award').slice(0, 1)) {
    const key = kind(i).replace(/-award$/, '');
    const awardSlug = Object.keys(AWARDS).find((a) => key.endsWith(a));
    if (!awardSlug) continue;
    const token = key.slice(0, -awardSlug.length - 1).split('-').pop();
    const player = PLAYERS.find((p) => p.slug.split('-').includes(token) || p.short.some((x) => x.toLowerCase() === token));
    if (player && (i.playerTags ?? []).includes(player.slug))
      add(
        `이번 주 ${AWARDS[awardSlug]} 소식으로 가장 많이 보도된 선수는?`,
        player.ko,
        othersThan(player.ko, [...(i.playerTags ?? []).map((t) => PLAYER_BY_SLUG[t]?.ko).filter(Boolean), ...popularNames]).slice(0, 12),
        `${article(i)} — ${i.sourceCount}개 매체가 다뤘어요.`,
        `/issue/${i.slug}`,
      );
  }

  const kst = new Date(Date.parse(id) + 0);
  return {
    id,
    title: `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 주간 해외축구 퀴즈`,
    createdAt: new Date(now).toISOString(),
    basis: '최근 7일 수집 기록 기준',
    questions: shuffle(questions).slice(0, GAME.quizSize),
  };
}

async function main() {
  const id = weekId();
  await mkdir(QUIZ_DIR, { recursive: true });
  const file = path.join(QUIZ_DIR, `${id}.json`);
  if ((await readdir(QUIZ_DIR)).includes(`${id}.json`) && !process.argv.includes('--force')) {
    console.log(`이번 주 퀴즈(${id})가 이미 있습니다. 다시 만들려면 --force`);
    return;
  }
  const issues = await readJson(path.join(DATA, 'issues.json'), []);
  const days = (await readdir(path.join(DATA, 'articles'))).filter((f) => f.endsWith('.json')).sort().slice(-8);
  const articles = (await Promise.all(days.map((f) => readJson(path.join(DATA, 'articles', f), [])))).flat();
  const quiz = buildQuiz({ issues, articles, id });
  if (quiz.questions.length < 4) {
    console.log(`출제 가능한 문제가 ${quiz.questions.length}개뿐이라 이번 주 퀴즈를 만들지 않았습니다.`);
    return;
  }
  await writeFile(file, JSON.stringify(quiz, null, 1) + '\n');
  console.log(`퀴즈 생성: ${path.relative(process.cwd(), file)} (${quiz.questions.length}문제)`);
}

if (process.argv[1]?.endsWith('quiz.mjs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
