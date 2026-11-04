// 기사 단위 신뢰도 티어. 매체 기본 티어(config/sources.mjs)에서 출발해, 이 기사가 "누구의 보도인지"로 조정한다.
//  1) 제목이 다른 매체·기자를 출처로 인용 → 인용된 쪽의 티어 (로마노 인용이면 T1, The Sun 인용이면 T4)
//     알 수 없는 출처(해설가 의견 등)를 인용하면 T3보다 높게 보지 않음
//  2) 가십 모음·라이브 블로그·"○○ latest:" 같은 모음 기사 → T4 (여러 매체 보도를 옮겨 담은 기사)
//  3) 지역지가 연고 클럽(home)을 직접 보도 → 한 단계 높게 (T3 → T2)
//  4) 그 밖에는 매체 기본 티어
import { SOURCES, SOURCE_BY_ID, squash, isOwnSource } from './sources.mjs';

// 인용으로만 들어오는 기자·매체 (X 게시물 등 직접 수집하지 않는 출처). keys 는 한글·영문 표기 일부
export const REPORTERS = [
  { label: '로마노', tier: 1, keys: ['로마노', 'romano'] },
  { label: '온스테인', tier: 1, keys: ['온스테인', 'ornstein'] },
  { label: '디 마르치오', tier: 1, keys: ['마르치오', 'dimarzio'] },
  { label: '솔레콜', tier: 1, keys: ['솔레콜', 'solhekol'] },
  { label: '플레텐베르크', tier: 2, keys: ['플레텐베르크', 'plettenberg'] },
  { label: '모레토', tier: 2, keys: ['모레토', 'moretto'] },
  { label: '스타인버그', tier: 2, keys: ['스타인버그', 'steinberg'] },
  { label: '텔레그래프', tier: 2, keys: ['텔레그래프', 'telegraph'] },
  { label: '더 타임스', tier: 2, keys: ['타임스', 'thetimes'] },
  { label: '빌트', tier: 3, keys: ['빌트', 'bild'] },
  { label: '데일리 메일', tier: 4, keys: ['데일리메일', 'dailymail'] },
  { label: '익스프레스', tier: 4, keys: ['익스프레스', 'express'] },
];

/** 인용 출처 문자열 → { tier, label } | null */
export function creditedTier(credited) {
  const c = squash(credited);
  if (!c) return null;
  const r = REPORTERS.find((x) => x.keys.some((k) => c.includes(squash(k))));
  if (r) return { tier: r.tier, label: r.label };
  // 수집 매체 (별칭 포함, 예: 디 가디언 → Guardian)
  const o = SOURCES.find((s) => isOwnSource(s.id, credited) || isOwnSource(s.id, credited.replace(/^(디|더)\s*/, '')));
  return o ? { tier: o.tier, label: o.name } : null;
}

const ROUNDUP_RE = [
  /\bgossip\b/i,
  /\bpaper talk\b/i,
  /\brumou?rs?:/i,
  /\btransfer (news )?live\b/i,
  /\bLIVE\b/,
  /^[^:]{2,40}\b(latest|news|round-?up|done deals)\s*:/i,
];
export const isRoundup = (title) => ROUNDUP_RE.some((re) => re.test(title ?? ''));

/** 기사 → { tier, base, why, via } — why: 'credited' | 'roundup' | 'home' | null */
export function articleTier(a) {
  const src = SOURCE_BY_ID[a.source] ?? { tier: 4, name: a.source };
  const base = src.tier;
  if (a.credited) {
    const c = creditedTier(a.credited);
    if (c && c.label === src.name) return { tier: base, base, why: null, via: null };
    return c ? { tier: c.tier, base, why: 'credited', via: c.label } : { tier: Math.max(base, 3), base, why: 'credited', via: a.credited };
  }
  if (isRoundup(a.title)) return { tier: 4, base, why: 'roundup', via: null };
  if (src.home && (a.clubs ?? []).some((c) => src.home.includes(c))) return { tier: Math.max(1, base - 1), base, why: 'home', via: null };
  return { tier: base, base, why: null, via: null };
}

export const tierOf = (a) => articleTier(a).tier;

/** 티어 근거 짧은 설명 (카드 표시용) */
export function tierNote(t) {
  if (t.why === 'credited') return `${t.via} 인용`;
  if (t.why === 'roundup') return '모음 기사';
  if (t.why === 'home') return '연고지 보도';
  return null;
}

/** 기사 묶음에서 가장 신뢰도 높은 보도 → { tier, name, note } */
export function bestReport(articles) {
  let best = null;
  for (const a of articles) {
    const t = articleTier(a);
    if (!best || t.tier < best.t.tier) best = { a, t };
  }
  if (!best) return { tier: 4, name: '', note: null };
  return { tier: best.t.tier, name: SOURCE_BY_ID[best.a.source]?.name ?? best.a.source, note: tierNote(best.t) };
}
