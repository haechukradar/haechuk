// 선수 현재 소속 학습: 경기·인터뷰·평점 기사 제목에서 Claude가 뽑은 (선수, 소속) 짝을 쌓는다.
// Claude는 지식 시점 이후의 이적(예: 이번 여름 이적)을 모르므로, 사이트가 받은 뉴스 흐름으로 최신 소속을 메운다.
// 같은 소속이 MIN_SEEN 번 이상 확인되면 "확인된 소속"으로 보고:
//  - 그 클럽으로 가는 "이적" 기사는 지난 이적으로 처리 (enrich.mjs)
//  - 다음 요청부터 Claude에게 현재 소속 목록으로 전달
import { readFile, writeFile } from 'node:fs/promises';

const MIN_SEEN = 2;
const HINT_MAX = 300;

const squash = (s) => (s ?? '').replace(/\s+/g, '');
// 성만 쓴 표기도 같은 사람으로 ("브래들리 바르콜라" ↔ "바르콜라")
const sameName = (a, b) => a === b || (a.length >= 2 && b.length >= 2 && (a.endsWith(b) || b.endsWith(a)));

let rosters = {}; // squash(name) -> { name, club, count, last }

export async function loadRosters(file) {
  try {
    rosters = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    rosters = {};
  }
  return rosters;
}

export const saveRosters = (file) => writeFile(file, JSON.stringify(rosters, null, 1) + '\n');

function find(name) {
  const k = squash(name);
  if (!k) return null;
  if (rosters[k]) return rosters[k];
  // 성만 같은 다른 선수와 섞이지 않도록 후보가 하나일 때만
  const hits = Object.entries(rosters).filter(([key]) => sameName(key, k));
  return hits.length === 1 ? hits[0][1] : null;
}

/** 확인된 현재 소속 (한국어 클럽명) 또는 null */
export function confirmedClub(name) {
  const r = find(name);
  return r && r.count >= MIN_SEEN ? r.club : null;
}

/** 기사 하나의 (선수, 소속) 짝을 기록. 소속이 바뀌면 새 소속으로 다시 센다 */
export function learn(pairs, at, sameClub) {
  for (const { player, club } of pairs ?? []) {
    if (!player || !club) continue;
    const k = squash(player);
    const cur = rosters[k];
    if (cur && sameClub(cur.club, club)) Object.assign(cur, { count: cur.count + 1, last: at > cur.last ? at : cur.last });
    else if (!cur || at > cur.last) rosters[k] = { name: player, club, count: 1, last: at }; // 더 최근 기사가 다른 소속이면 이적한 것
  }
}

/** Claude에게 줄 현재 소속 목록 ("바르콜라=리버풀, ...") — 최근 확인 순 */
export function rosterHint() {
  return Object.values(rosters)
    .filter((r) => r.count >= MIN_SEEN)
    .sort((a, b) => (a.last < b.last ? 1 : -1))
    .slice(0, HINT_MAX)
    .map((r) => `${r.name}=${r.club}`)
    .join(', ');
}
