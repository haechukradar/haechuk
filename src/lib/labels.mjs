export const STAGES = [
  ['interest', '관심'],
  ['negotiation', '협상'],
  ['agreement', '합의'],
  ['done', '확정'],
  ['collapsed', '결렬'],
];
export const STAGE_LABEL = Object.fromEntries(STAGES);

export const CATEGORY_LABEL = {
  transfer: '이적',
  match: '경기',
  injury: '부상',
  manager: '감독',
  other: '일반',
};

export const fmtKst = (iso) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

const ORDER = ['interest', 'negotiation', 'agreement', 'done'];
/** 이적 단계 변화 표시: { icon, text, kind } */
export function stageChangeInfo(change) {
  if (!change) return null;
  const from = STAGE_LABEL[change.from];
  const to = STAGE_LABEL[change.to];
  if (change.to === 'collapsed') return { icon: '⛔', text: `${from} → 결렬`, kind: 'down' };
  if (change.from === 'collapsed') return { icon: '🔁', text: `결렬 → ${to} 재점화`, kind: 'up' };
  const up = ORDER.indexOf(change.to) > ORDER.indexOf(change.from);
  return { icon: up ? '🔺' : '🔻', text: `${from} → ${to}`, kind: up ? 'up' : 'down' };
}

// 최근 단계 변화로 볼 기간
export const RECENT_CHANGE_HOURS = 48;
export const isRecentChange = (change, now = Date.now()) =>
  !!change && now - Date.parse(change.at) < RECENT_CHANGE_HOURS * 3600_000;
