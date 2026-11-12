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
  'sagan-tosu': ['TOS', '#1E9BD7', '사간 도스'],
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
