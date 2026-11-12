// 뉴스 카드 왼쪽 배지: 클럽 약칭 + 클럽 대표색 (엠블럼·사진은 쓰지 않음 — 저작권·상표 원칙)
// 코리안리거 기사는 선수 성(예: 손)을 소속 클럽 색으로 표시
import { PLAYER_BY_SLUG } from './players.mjs';
import { CLUB_BY_SLUG } from './clubs.mjs';

export const CLUB_BADGE = {
  arsenal: ['ARS', '#EF0107'],
  chelsea: ['CHE', '#034694'],
  liverpool: ['LIV', '#C8102E'],
  'man-city': ['MCI', '#6CABDD'],
  'man-utd': ['MUN', '#DA291C'],
  tottenham: ['TOT', '#132257'],
  lafc: ['LAFC', '#000000'],
  atletico: ['ATM', '#CB3524'],
  bayern: ['FCB', '#DC052D'],
  mainz: ['M05', '#C3141E'],
  porto: ['POR', '#00428C'],
  schalke: ['S04', '#004D9D'],
  augsburg: ['FCA', '#BA3733'],
  besiktas: ['BJK', '#000000'],
  westerlo: ['WES', '#FFD100'],
  stoke: ['STK', '#E03A3E'],
  brentford: ['BRE', '#E30613'],
  newcastle: ['NEW', '#241F20'],
  gladbach: ['BMG', '#00A651'],
  'club-brugge': ['BRU', '#0067CE'],
  'union-berlin': ['FCU', '#EB1923'],
  midtjylland: ['FCM', '#1A1A1A'],
  swansea: ['SWA', '#1A1A1A'],
  birmingham: ['BIR', '#1F3C8B'],
  psg: ['PSG', '#004170'],
  wolves: ['WOL', '#FDB913'],
  feyenoord: ['FEY', '#E30613'],
  'aston-villa': ['AVL', '#670E36'],
  'west-ham': ['WHU', '#7A263A'],
  brighton: ['BHA', '#0057B8'],
  everton: ['EVE', '#003399'],
  'crystal-palace': ['CRY', '#1B458F'],
  'nottingham-forest': ['NFO', '#DD0000'],
  fulham: ['FUL', '#000000'],
  bournemouth: ['BOU', '#DA291C'],
  'real-madrid': ['RMA', '#00529F'],
  barcelona: ['BAR', '#A50044'],
  inter: ['INT', '#010E80'],
  'ac-milan': ['MIL', '#FB090B'],
  juventus: ['JUV', '#000000'],
  napoli: ['NAP', '#12A0D7'],
  roma: ['ROM', '#8E1F2F'],
  dortmund: ['BVB', '#FDE100'],
  leverkusen: ['B04', '#E32221'],
  leipzig: ['RBL', '#DD0741'],
  marseille: ['OM', '#2FAEE0'],
  monaco: ['ASM', '#E7242F'],
};

// 클럽 사전(config/clubs.mjs)에 없는 클럽: 퀴즈 등에서만 쓰는 배지 [약칭, 대표색, 한글명]
export const EXTRA_BADGE = {
  // 잉글랜드
  blackburn: ['BLB', '#009EE0', '블랙번'],
  bolton: ['BOL', '#263C7E', '볼턴'],
  cardiff: ['CAR', '#0070B5', '카디프'],
  coventry: ['COV', '#5BB5E8', '코번트리'],
  derby: ['DER', '#1A1A1A', '더비 카운티'],
  leeds: ['LEE', '#1D428A', '리즈'],
  leicester: ['LEI', '#003090', '레스터'],
  'leyton-orient': ['LOR', '#C8102E', '레이턴 오리엔트'],
  middlesbrough: ['MID', '#E11B22', '미들즈브러'],
  millwall: ['MWL', '#001D5E', '밀월'],
  norwich: ['NOR', '#00A650', '노리치'],
  qpr: ['QPR', '#1D5BA4', 'QPR'],
  reading: ['REA', '#004494', '레딩'],
  southampton: ['SOU', '#D71920', '사우샘프턴'],
  sunderland: ['SUN', '#EB172B', '선덜랜드'],
  wba: ['WBA', '#122F67', '웨스트브롬'],
  // 스코틀랜드·네덜란드·벨기에·포르투갈
  celtic: ['CEL', '#018749', '셀틱'],
  ajax: ['AJA', '#D2122E', '아약스'],
  psv: ['PSV', '#ED1C24', 'PSV'],
  anderlecht: ['AND', '#4E2C82', '안더레흐트'],
  antwerp: ['ANT', '#E30613', '앤트워프'],
  benfica: ['SLB', '#E20E0E', '벤피카'],
  sporting: ['SCP', '#008057', '스포르팅'],
  // 스페인·이탈리아
  valencia: ['VCF', '#F58220', '발렌시아'],
  mallorca: ['MLL', '#E20613', '마요르카'],
  lazio: ['LAZ', '#87D8F7', '라치오'],
  atalanta: ['ATA', '#1E71B8', '아탈란타'],
  fiorentina: ['FIO', '#482E92', '피오렌티나'],
  sampdoria: ['SAM', '#1B5497', '삼프도리아'],
  torino: ['TOR', '#881F19', '토리노'],
  brescia: ['BRS', '#0055A4', '브레시아'],
  reggina: ['REG', '#8B1A1A', '레지나'],
  pisa: ['PIS', '#1F3F8F', '피사'],
  venezia: ['VEN', '#F26722', '베네치아'],
  ravenna: ['RAV', '#C8102E', '라벤나'],
  // 독일·오스트리아·스위스
  hamburg: ['HSV', '#0A3F86', '함부르크'],
  werder: ['SVW', '#1D9053', '베르더 브레멘'],
  kaiserslautern: ['FCK', '#E2001A', '카이저슬라우테른'],
  homburg: ['HOM', '#00843D', '홈부르크'],
  salzburg: ['RBS', '#D6082B', '잘츠부르크'],
  basel: ['BAS', '#C8102E', '바젤'],
  // 프랑스
  lille: ['LOS', '#E01E13', '릴'],
  metz: ['MET', '#8B1538', '메스'],
  montpellier: ['MHS', '#F26522', '몽펠리에'],
  grenoble: ['GF3', '#1F5FAA', '그르노블'],
  istres: ['IST', '#0059A8', '이스트르'],
  tours: ['TFC', '#1C1C6C', '투르'],
  'le-mans': ['LMA', '#D71920', '르망'],
  guingamp: ['EAG', '#E2001A', '갱강'],
  // 동유럽·튀르키예
  'dinamo-zagreb': ['DIN', '#0047AB', '디나모 자그레브'],
  zrinjski: ['ZRI', '#C8102E', '즈리니스키'],
  'inter-zapresic': ['IZA', '#E0A800', '인테르 자프레시치'],
  'lech-poznan': ['LPO', '#0055A4', '레흐 포즈난'],
  znicz: ['ZNI', '#D71920', '즈니치 프루슈쿠프'],
  malmo: ['MFF', '#3B8BD0', '말뫼'],
  fenerbahce: ['FB', '#002D72', '페네르바흐체'],
  galatasaray: ['GS', '#A90432', '갈라타사라이'],
  trabzonspor: ['TS', '#741C2F', '트라브존스포르'],
  // 아시아·중동
  'sagan-tosu': ['TOS', '#1E9BD7', '사간 도스'],
  kyoto: ['KYO', '#6A1B9A', '교토 퍼플상가'],
  'fc-seoul': ['SEO', '#B30000', 'FC 서울'],
  pohang: ['POH', '#D71920', '포항 스틸러스'],
  jeonbuk: ['JBH', '#0C6E3A', '전북 현대'],
  ulsan: ['ULS', '#0066B3', '울산 현대'],
  incheon: ['INC', '#1A1F71', '인천 유나이티드'],
  seongnam: ['SFC', '#1A1A1A', '성남 일화'],
  'gwangju-sangmu': ['SGM', '#C8102E', '광주 상무'],
  'gyeongju-khnp': ['KHN', '#0054A6', '경주 한수원'],
  'beijing-guoan': ['BGA', '#006B3C', '베이징 궈안'],
  'shanghai-shenhua': ['SHS', '#2A3E8E', '상하이 선화'],
  'al-nassr': ['NAS', '#FCD116', '알나스르'],
  'al-hilal': ['HIL', '#0055A5', '알힐랄'],
  'al-mokawloon': ['MOK', '#E0B000', '알 무카울룬'],
  'mumbai-city': ['MCF', '#4FA3DB', '뭄바이 시티'],
  atk: ['ATK', '#E4002B', 'ATK'],
  // 미주
  'la-galaxy': ['LAG', '#00245D', 'LA 갤럭시'],
  'ny-red-bulls': ['NYR', '#D50032', '뉴욕 레드불스'],
  nycfc: ['NYC', '#6CACE4', '뉴욕 시티'],
  'dc-united': ['DCU', '#1A1A1A', 'DC 유나이티드'],
  montreal: ['MTL', '#0033A1', '몬트리올 임팩트'],
  'phoenix-rising': ['PHX', '#E8471D', '피닉스 라이징'],
  'chicago-fire': ['CHI', '#C8102E', '시카고 파이어'],
  boca: ['BOC', '#103F79', '보카 주니어스'],
  rosario: ['ROS', '#1C3F94', '로사리오 센트럴'],
  corinthians: ['COR', '#1A1A1A', '코린치안스'],
};

/** 클럽 slug → { text, bg, fg, ko } (퀴즈 경력 경로 등) */
export function clubBadge(slug) {
  const c = CLUB_BADGE[slug];
  if (c) return { text: c[0], bg: c[1], fg: inkFor(c[1]), ko: CLUB_BY_SLUG[slug]?.ko ?? slug };
  const e = EXTRA_BADGE[slug];
  if (e) return { text: e[0], bg: e[1], fg: inkFor(e[1]), ko: e[2] };
  return { text: slug.slice(0, 3).toUpperCase(), bg: null, fg: null, ko: slug };
}

// 클럽이 없는 기사: 리그 약칭 (무채색). 리그도 없으면 빈 배지 → 공 아이콘
const LEAGUE_BADGE = { epl: 'EPL', laliga: 'LIGA', seriea: 'SA', bundesliga: 'BUN', ligue1: 'L1' };

// 밝은 바탕이면 글자를 어둡게
function inkFor(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? '#1A1A1A' : '#FFFFFF';
}

/** 기사 → { text, bg, fg, title } (bg 가 null 이면 무채색 기본 배지) */
export function badgeFor(a) {
  const tags = a.playerTags ?? [];
  const kr = tags.map((s) => PLAYER_BY_SLUG[s]).find((p) => p?.korean);
  if (kr) {
    const color = CLUB_BADGE[kr.club]?.[1] ?? null;
    return { text: kr.ko[0], bg: color, fg: color ? inkFor(color) : null, title: kr.ko };
  }
  const club = (a.clubs ?? []).find((c) => CLUB_BADGE[c]);
  if (club) {
    const [text, color] = CLUB_BADGE[club];
    return { text, bg: color, fg: inkFor(color), title: CLUB_BY_SLUG[club]?.ko ?? null };
  }
  return { text: LEAGUE_BADGE[a.league] ?? '', bg: null, fg: null, title: null };
}
