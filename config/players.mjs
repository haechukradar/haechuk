// 선수 사전 (선수 즐겨찾기·선수 페이지·코리안리거 피드). 소속은 이적 시 갱신.
// full: 풀네임 표기 (대소문자·하이픈·공백·악센트 무시하고 매칭)
// short: 그것만으로 누군지 분명한 성/애칭 (단어 단위로만 매칭). 흔한 성(Silva, Martinez, Son 등)은 넣지 않는다.
// club: config/clubs.mjs 의 slug (있으면 클럽 링크·리그 분류), korean: 코리안리거
import { CLUB_BY_SLUG } from './clubs.mjs';

const P = (slug, ko, team, club, full, short = [], extra = {}) => ({ slug, ko, team, club, full, short, ...extra });
const K = { korean: true };

export const PLAYERS = [
  // 코리안리거 (소속 마지막 확인: 2026-10-23, 2026-27 시즌 기준)
  // surname: 흔한 성. 단독으로 나오면 같은 제목·description에 현재 소속 클럽(club) 이름이 함께 있을 때만 인식
  P('son-heung-min', '손흥민', 'LAFC', 'lafc', ['Son Heung-min', 'Heung-min Son', 'Son Heungmin', 'Heungmin Son'], [], { ...K, surname: 'Son' }),
  P('lee-kang-in', '이강인', '아틀레티코 마드리드', 'atletico', ['Lee Kang-in', 'Kang-in Lee', 'Kangin Lee', 'Lee Kangin'], [], { ...K, surname: 'Lee' }),
  P('kim-min-jae', '김민재', '바이에른 뮌헨', 'bayern', ['Kim Min-jae', 'Min-jae Kim', 'Minjae Kim', 'Kim Minjae'], [], { ...K, surname: 'Kim' }),
  P('hwang-hee-chan', '황희찬', '샬케 04 (울버햄튼 임대)', 'schalke', ['Hwang Hee-chan', 'Hee-chan Hwang', 'Heechan Hwang', 'Hwang Heechan'], [], { ...K, surname: 'Hwang' }),
  P('lee-jae-sung', '이재성', '마인츠', 'mainz', ['Lee Jae-sung', 'Jae-sung Lee', 'Jaesung Lee', 'Lee Jaesung'], [], { ...K, surname: 'Lee' }),
  P('hwang-in-beom', '황인범', 'FC 포르투', 'porto', ['Hwang In-beom', 'In-beom Hwang', 'Inbeom Hwang', 'Hwang Inbeom'], [], { ...K, surname: 'Hwang' }),
  P('yang-min-hyeok', '양민혁', '베스테를로 (토트넘 임대)', 'westerlo', ['Yang Min-hyeok', 'Min-hyeok Yang', 'Minhyeok Yang', 'Yang Minhyeok'], [], { ...K, surname: 'Yang' }),
  P('seol-young-woo', '설영우', '아우크스부르크', 'augsburg', ['Seol Young-woo', 'Young-woo Seol', 'Youngwoo Seol', 'Seol Youngwoo'], [], { ...K, surname: 'Seol' }),
  P('oh-hyeon-gyu', '오현규', '베식타스', 'besiktas', ['Oh Hyeon-gyu', 'Hyeon-gyu Oh', 'Hyun-gyu Oh', 'Oh Hyun-gyu', 'Hyeongyu Oh'], [], { ...K, surname: 'Oh', surnameExclude: ['Oh no', 'Oh dear', 'Oh my', 'Oh well', 'Oh!', 'Oh,', 'Oh?'] }),
  P('bae-jun-ho', '배준호', '스토크 시티', 'stoke', ['Bae Jun-ho', 'Jun-ho Bae', 'Junho Bae', 'Bae Junho'], [], { ...K, surname: 'Bae' }),
  P('kim-ji-soo', '김지수', '브렌트퍼드', 'brentford', ['Kim Ji-soo', 'Ji-soo Kim', 'Jisoo Kim', 'Kim Jisoo'], [], { ...K, surname: 'Kim' }),
  // 'Park'은 St James' Park(뉴캐슬 홈구장)와 겹치므로 성 단독 매칭 제외
  P('park-seung-soo', '박승수', '뉴캐슬', 'newcastle', ['Park Seung-soo', 'Seung-soo Park', 'Seungsoo Park'], [], K),
  P('jens-castrop', '옌스 카스트로프', '묀헨글라트바흐', 'gladbach', ['Jens Castrop'], ['Castrop'], K),
  P('lee-han-beom', '이한범', '클뤼프 브뤼허', 'club-brugge', ['Lee Han-beom', 'Han-beom Lee', 'Hanbeom Lee'], [], { ...K, surname: 'Lee' }),
  P('jeong-woo-yeong', '정우영', '우니온 베를린', 'union-berlin', ['Jeong Woo-yeong', 'Woo-yeong Jeong', 'Jung Woo-young', 'Woo-young Jung', 'Wooyeong Jeong'], [], { ...K, surname: 'Jeong' }),
  P('cho-gue-sung', '조규성', '미트윌란', 'midtjylland', ['Cho Gue-sung', 'Gue-sung Cho', 'Guesung Cho', 'Cho Guesung'], [], { ...K, surname: 'Cho' }),
  P('eom-ji-sung', '엄지성', '스완지 시티', 'swansea', ['Eom Ji-sung', 'Ji-sung Eom', 'Jisung Eom'], [], { ...K, surname: 'Eom' }),
  P('paik-seung-ho', '백승호', '버밍엄 시티', 'birmingham', ['Paik Seung-ho', 'Seung-ho Paik', 'Baek Seung-ho', 'Seungho Paik'], [], { ...K, surname: 'Paik' }),

  // 프리미어리그
  P('erling-haaland', '엘링 홀란', '맨체스터 시티', 'man-city', ['Erling Haaland'], ['Haaland']),
  P('phil-foden', '필 포든', '맨체스터 시티', 'man-city', ['Phil Foden'], ['Foden']),
  P('rodri', '로드리', '맨체스터 시티', 'man-city', ['Rodrigo Hernandez'], ['Rodri']),
  P('josko-gvardiol', '요슈코 그바르디올', '맨체스터 시티', 'man-city', ['Josko Gvardiol'], ['Gvardiol']),
  P('jeremy-doku', '제레미 도쿠', '맨체스터 시티', 'man-city', ['Jeremy Doku'], ['Doku']),
  P('rayan-cherki', '라얀 셰르키', '맨체스터 시티', 'man-city', ['Rayan Cherki'], ['Cherki']),
  P('mohamed-salah', '모하메드 살라', '리버풀', 'liverpool', ['Mohamed Salah', 'Mo Salah'], ['Salah']),
  P('virgil-van-dijk', '버질 반 다이크', '리버풀', 'liverpool', ['Virgil van Dijk'], ['Van Dijk']),
  P('florian-wirtz', '플로리안 비르츠', '리버풀', 'liverpool', ['Florian Wirtz'], ['Wirtz']),
  P('alexander-isak', '알렉산데르 이삭', '리버풀', 'liverpool', ['Alexander Isak'], ['Isak']),
  P('hugo-ekitike', '위고 에키티케', '리버풀', 'liverpool', ['Hugo Ekitike'], ['Ekitike']),
  P('alexis-mac-allister', '알렉시스 맥알리스터', '리버풀', 'liverpool', ['Alexis Mac Allister'], ['Mac Allister']),
  P('dominik-szoboszlai', '도미니크 소보슬러이', '리버풀', 'liverpool', ['Dominik Szoboszlai'], ['Szoboszlai']),
  P('rio-ngumoha', '리오 은구모하', '리버풀', 'liverpool', ['Rio Ngumoha'], ['Ngumoha']),
  P('bukayo-saka', '부카요 사카', '아스널', 'arsenal', ['Bukayo Saka'], ['Saka']),
  P('martin-odegaard', '마르틴 외데고르', '아스널', 'arsenal', ['Martin Odegaard'], ['Odegaard', 'Ødegaard']),
  P('declan-rice', '데클란 라이스', '아스널', 'arsenal', ['Declan Rice'], []),
  P('viktor-gyokeres', '빅토르 요케레스', '아스널', 'arsenal', ['Viktor Gyokeres'], ['Gyokeres']),
  P('eberechi-eze', '에베레치 에제', '아스널', 'arsenal', ['Eberechi Eze'], ['Eze']),
  P('william-saliba', '윌리엄 살리바', '아스널', 'arsenal', ['William Saliba'], ['Saliba']),
  P('cole-palmer', '콜 파머', '첼시', 'chelsea', ['Cole Palmer'], []),
  P('moises-caicedo', '모이세스 카이세도', '첼시', 'chelsea', ['Moises Caicedo'], ['Caicedo']),
  P('enzo-fernandez', '엔소 페르난데스', '첼시', 'chelsea', ['Enzo Fernandez'], []),
  P('estevao', '에스테방', '첼시', 'chelsea', ['Estevao Willian'], ['Estevao']),
  P('joao-pedro', '주앙 페드루', '첼시', 'chelsea', ['Joao Pedro'], []),
  P('alejandro-garnacho', '알레한드로 가르나초', '첼시', 'chelsea', ['Alejandro Garnacho'], ['Garnacho']),
  P('bruno-fernandes', '브루노 페르난데스', '맨체스터 유나이티드', 'man-utd', ['Bruno Fernandes'], []),
  P('kobbie-mainoo', '코비 마이누', '맨체스터 유나이티드', 'man-utd', ['Kobbie Mainoo'], ['Mainoo']),
  P('bryan-mbeumo', '브라이언 음뵈모', '맨체스터 유나이티드', 'man-utd', ['Bryan Mbeumo'], ['Mbeumo']),
  P('matheus-cunha', '마테우스 쿠냐', '맨체스터 유나이티드', 'man-utd', ['Matheus Cunha'], []),
  P('benjamin-sesko', '베냐민 셰슈코', '맨체스터 유나이티드', 'man-utd', ['Benjamin Sesko'], ['Sesko']),
  P('xavi-simons', '사비 시몬스', '토트넘', 'tottenham', ['Xavi Simons'], []),
  P('james-maddison', '제임스 매디슨', '토트넘', 'tottenham', ['James Maddison'], ['Maddison']),
  P('dejan-kulusevski', '데얀 쿨루셉스키', '토트넘', 'tottenham', ['Dejan Kulusevski'], ['Kulusevski']),
  P('micky-van-de-ven', '미키 판더펜', '토트넘', 'tottenham', ['Micky van de Ven'], ['Van de Ven']),
  P('bruno-guimaraes', '브루노 기마랑이스', '뉴캐슬', 'newcastle', ['Bruno Guimaraes'], []),
  P('anthony-gordon', '앤서니 고든', '뉴캐슬', 'newcastle', ['Anthony Gordon'], []),
  P('morgan-rogers', '모건 로저스', '애스턴 빌라', 'aston-villa', ['Morgan Rogers'], []),
  P('marcus-rashford', '마커스 래시포드', '바르셀로나', 'barcelona', ['Marcus Rashford'], ['Rashford']),

  // 라리가
  P('kylian-mbappe', '킬리안 음바페', '레알 마드리드', 'real-madrid', ['Kylian Mbappe'], ['Mbappe', 'Mbappé']),
  P('vinicius-junior', '비니시우스 주니오르', '레알 마드리드', 'real-madrid', ['Vinicius Junior', 'Vinicius Jr'], ['Vinicius', 'Vini']),
  P('jude-bellingham', '주드 벨링엄', '레알 마드리드', 'real-madrid', ['Jude Bellingham'], []),
  P('federico-valverde', '페데리코 발베르데', '레알 마드리드', 'real-madrid', ['Federico Valverde', 'Fede Valverde'], []),
  P('trent-alexander-arnold', '트렌트 알렉산더아놀드', '레알 마드리드', 'real-madrid', ['Trent Alexander-Arnold', 'Alexander-Arnold'], []),
  P('rodrygo', '호드리구', '레알 마드리드', 'real-madrid', ['Rodrygo Goes'], ['Rodrygo']),
  P('endrick', '엔드릭', '레알 마드리드', 'real-madrid', ['Endrick Felipe'], ['Endrick']),
  P('dean-huijsen', '딘 하위선', '레알 마드리드', 'real-madrid', ['Dean Huijsen'], ['Huijsen']),
  P('thibaut-courtois', '티보 쿠르투아', '레알 마드리드', 'real-madrid', ['Thibaut Courtois'], ['Courtois']),
  P('lamine-yamal', '라민 야말', '바르셀로나', 'barcelona', ['Lamine Yamal'], ['Yamal']),
  P('pedri', '페드리', '바르셀로나', 'barcelona', ['Pedro Gonzalez Lopez'], ['Pedri']),
  P('raphinha', '하피냐', '바르셀로나', 'barcelona', ['Raphael Dias Belloli'], ['Raphinha']),
  P('robert-lewandowski', '로베르트 레반도프스키', '바르셀로나', 'barcelona', ['Robert Lewandowski'], ['Lewandowski']),
  P('dani-olmo', '다니 올모', '바르셀로나', 'barcelona', ['Dani Olmo'], ['Olmo']),
  P('gavi', '가비', '바르셀로나', 'barcelona', ['Pablo Paez Gavira'], ['Gavi']),
  P('frenkie-de-jong', '프렝키 더용', '바르셀로나', 'barcelona', ['Frenkie de Jong'], []),
  P('julian-alvarez', '훌리안 알바레스', '아틀레티코 마드리드', 'atletico', ['Julian Alvarez'], []),
  P('nico-williams', '니코 윌리엄스', '아틀레틱 빌바오', null, ['Nico Williams'], []),

  // 분데스리가
  P('harry-kane', '해리 케인', '바이에른 뮌헨', 'bayern', ['Harry Kane'], ['Kane']),
  P('jamal-musiala', '자말 무시알라', '바이에른 뮌헨', 'bayern', ['Jamal Musiala'], ['Musiala']),
  P('joshua-kimmich', '요주아 키미히', '바이에른 뮌헨', 'bayern', ['Joshua Kimmich'], ['Kimmich']),
  P('michael-olise', '마이클 올리세', '바이에른 뮌헨', 'bayern', ['Michael Olise'], ['Olise']),
  P('luis-diaz', '루이스 디아스', '바이에른 뮌헨', 'bayern', ['Luis Diaz'], []),

  // 세리에A
  P('lautaro-martinez', '라우타로 마르티네스', '인터 밀란', 'inter', ['Lautaro Martinez'], ['Lautaro']),
  P('rafael-leao', '하파엘 레앙', 'AC 밀란', 'ac-milan', ['Rafael Leao'], ['Leao']),
  P('luka-modric', '루카 모드리치', 'AC 밀란', 'ac-milan', ['Luka Modric'], ['Modric']),
  P('christian-pulisic', '크리스천 풀리식', 'AC 밀란', 'ac-milan', ['Christian Pulisic'], ['Pulisic']),
  P('kenan-yildiz', '케난 일디즈', '유벤투스', 'juventus', ['Kenan Yildiz'], ['Yildiz']),
  P('dusan-vlahovic', '두산 블라호비치', '유벤투스', 'juventus', ['Dusan Vlahovic'], ['Vlahovic']),
  P('kevin-de-bruyne', '케빈 더브라위너', '나폴리', 'napoli', ['Kevin De Bruyne'], ['De Bruyne']),
  P('scott-mctominay', '스콧 맥토미니', '나폴리', 'napoli', ['Scott McTominay'], ['McTominay']),

  // 리그1
  P('ousmane-dembele', '우스만 뎀벨레', '파리 생제르맹', 'psg', ['Ousmane Dembele'], ['Dembele', 'Dembélé']),
  P('khvicha-kvaratskhelia', '흐비차 크바라츠헬리아', '파리 생제르맹', 'psg', ['Khvicha Kvaratskhelia'], ['Kvaratskhelia', 'Kvara']),
  P('vitinha', '비티냐', '파리 생제르맹', 'psg', ['Vitor Machado Ferreira'], ['Vitinha']),
  P('desire-doue', '데지레 두에', '파리 생제르맹', 'psg', ['Desire Doue'], ['Doue', 'Doué']),
  P('joao-neves', '주앙 네베스', '파리 생제르맹', 'psg', ['Joao Neves'], []),
  P('achraf-hakimi', '아슈라프 하키미', '파리 생제르맹', 'psg', ['Achraf Hakimi'], ['Hakimi']),

  // 기타
  P('lionel-messi', '리오넬 메시', '인터 마이애미', null, ['Lionel Messi'], ['Messi']),
  P('cristiano-ronaldo', '크리스티아누 호날두', '알나스르', null, ['Cristiano Ronaldo'], ['Cristiano']),
  P('neymar', '네이마르', '산투스', null, ['Neymar Jr'], ['Neymar']),
  P('victor-osimhen', '빅터 오시멘', '갈라타사라이', null, ['Victor Osimhen'], ['Osimhen']),
];

export const PLAYER_BY_SLUG = Object.fromEntries(PLAYERS.map((p) => [p.slug, p]));
export const KOREAN_PLAYERS = PLAYERS.filter((p) => p.korean);
export const isKorean = (slug) => !!PLAYER_BY_SLUG[slug]?.korean;

// 악센트 제거 + 소문자 (한글은 NFD에서 자모로 분해되므로 다시 NFC로 합침)
const unaccent = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
const fold = (s) => unaccent(s).toLowerCase();
const compact = (s) => fold(s).replace(/[^a-z가-힣]/g, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (words, flags) => new RegExp(`(^|[^\\p{L}])(${words.map(esc).join('|')})(?=$|[^\\p{L}])`, flags);

// 같은 성의 한국인 선수가 같은 클럽에 2명 이상이면 성 단독 매칭 비활성화
const surnameClubCount = {};
for (const p of PLAYERS) if (p.surname && p.club) surnameClubCount[`${p.surname}@${p.club}`] = (surnameClubCount[`${p.surname}@${p.club}`] ?? 0) + 1;

const MATCHERS = PLAYERS.map((p) => {
  const ko = compact(p.ko);
  // 한국어 성(마지막 어절)도 LLM 추출명 매칭에 사용 (예: '음바페')
  const koLast = p.ko.includes(' ') ? compact(p.ko.split(' ').at(-1)) : null;
  const shortWords = [...new Set(p.short.map((s) => fold(s).replace(/[^a-z가-힣]+/g, ' ').trim()))];
  const club = p.club ? CLUB_BY_SLUG[p.club] : null;
  const surnameOk = p.surname && club && surnameClubCount[`${p.surname}@${p.club}`] === 1;
  return {
    slug: p.slug,
    korean: !!p.korean,
    full: p.full.map(compact),
    koNames: [ko, koLast].filter(Boolean),
    short: shortWords.length ? new RegExp(`(^| )(${shortWords.map(esc).join('|')})( |$)`) : null,
    // 성은 대문자로 시작하는 단어 그대로 (악센트만 제거) — 'son'(영어·튀르키예어 일반 단어) 등 소문자는 무시
    surname: surnameOk ? wordRe([p.surname], 'u') : null,
    // 감탄사 등 성과 같은 철자의 관용 표현 (대소문자 무시)
    surnameExclude: (p.surnameExclude ?? []).map((x) => x.toLowerCase()),
    // 클럽 맥락은 config/clubs.mjs 의 현재 소속 클럽 이름 변형
    clubCtx: surnameOk ? wordRe(club.aliases, 'iu') : null,
  };
});

const surnameHit = (m, text) =>
  !!text && m.surname.test(text) && !m.surnameExclude.some((x) => text.toLowerCase().includes(x));

function matchIn(m, text, llm) {
  if (!text) return null;
  const flat = compact(text);
  if (m.full.some((k) => flat.includes(k))) return 'fullname';
  if (m.short) {
    const words = ' ' + fold(text).replace(/['’]s\b/g, '').replace(/[^a-z가-힣]+/g, ' ').trim() + ' ';
    if (m.short.test(words)) return 'short';
  }
  if (llm && llm.some((n) => m.koNames.includes(n))) return 'llm';
  return null;
}

/**
 * 제목(+ LLM 추출 선수명, + RSS description)에서 사전 선수 인식. 매칭 근거를 함께 반환.
 * description은 매칭에만 쓰고 저장·노출하지 않는다. description 매칭은 코리안리거에만 적용.
 * @returns {Array<{slug: string, via: string}>}
 */
export function tagPlayersDetailed(title, llmPlayers = [], desc = '') {
  const llm = llmPlayers.map(compact);
  const plainTitle = unaccent(title);
  const plainDesc = desc ? unaccent(desc) : '';
  const out = [];
  for (const m of MATCHERS) {
    let via = matchIn(m, title, llm);
    if (!via && m.surname && surnameHit(m, plainTitle) && (m.clubCtx.test(plainTitle) || (plainDesc && m.clubCtx.test(plainDesc)))) via = 'surname+club';
    if (!via && m.korean && plainDesc) {
      const d = matchIn(m, plainDesc, null);
      if (d) via = `${d}(desc)`;
      else if (m.surname && surnameHit(m, plainDesc) && m.clubCtx.test(plainDesc)) via = 'surname+club(desc)';
    }
    if (via) out.push({ slug: m.slug, via });
  }
  return out;
}

/** 제목(+ LLM 추출 선수명)에서 사전 선수 slug 목록 */
export const tagPlayers = (title, llmPlayers = [], desc = '') => tagPlayersDetailed(title, llmPlayers, desc).map((t) => t.slug);

/** 사전에 없는 LLM 추출 선수명 (명단 추가 후보 집계용) */
export function unknownPlayers(llmPlayers = []) {
  return llmPlayers.filter((n) => !MATCHERS.some((m) => m.koNames.includes(compact(n))));
}
