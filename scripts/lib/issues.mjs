// 기사 묶기(클러스터링) + 핫 트렌드 점수 산정
import { SOURCE_BY_ID, TIER_WEIGHT } from '../../config/sources.mjs';
import { PIPELINE, ACCURACY } from '../../config/site.mjs';
import { signature } from './rules.mjs';
import { CLUBS } from '../../config/clubs.mjs';
import { tagPlayers } from '../../config/players.mjs';
import { tierOf } from '../../config/tiers.mjs';

const H = 3600_000;
const STAGE_ORDER = ['interest', 'negotiation', 'agreement', 'done'];
const ts = (iso) => Date.parse(iso);
const uniq = (arr) => [...new Set(arr.filter(Boolean))];

export function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// 클럽명을 이루는 단어는 고유명사 후보에서 제외 (man, city, real 등)
const CLUB_WORDS = new Set(CLUBS.flatMap((c) => c.aliases.flatMap((x) => x.split(/\s+/))));
const articleSig = (a) => signature(a.title).filter((t) => !CLUB_WORDS.has(t));

// 규칙 기반 매칭: 이슈 시드 기사와 고유명사 2개 이상 + 자카드 0.3 이상 겹칠 때만 (정밀도 우선)
function ruleMatchScore(sigA, seed) {
  const setB = new Set(seed);
  const shared = sigA.filter((t) => setB.has(t)).length;
  const union = new Set([...sigA, ...seed]).size;
  return shared >= 2 && shared / union >= 0.3 ? shared / union : 0;
}

function toIssueArticle(a) {
  return {
    id: a.id,
    url: a.url,
    title: a.title,
    ko: a.ko,
    source: a.source,
    publishedAt: a.publishedAt,
    credited: a.credited,
    clubs: a.clubs ?? [],
    category: a.category,
    stage: a.stage,
    players: a.players ?? [],
    playerTags: a.playerTags ?? [],
    author: a.author ?? null,
    transfer: a.transfer ?? null,
  };
}

function newIssue(slug, a, mode) {
  return {
    slug,
    mode, // 'llm' | 'rule'
    titleKo: a.issueTitleKo ?? null,
    createdAt: a.publishedAt,
    updatedAt: a.publishedAt,
    category: a.category,
    stage: null,
    clubs: [],
    players: [],
    sig: [],
    articles: [],
  };
}

function addToIssue(issue, a) {
  if (issue.articles.some((x) => x.id === a.id)) return;
  issue.articles.push(toIssueArticle(a));
  issue.articles.sort((x, y) => ts(x.publishedAt) - ts(y.publishedAt));
  if (ts(a.publishedAt) > ts(issue.updatedAt)) issue.updatedAt = a.publishedAt;
  if (a.issueTitleKo && (!issue.titleKo || issue.mode === 'llm')) issue.titleKo = a.issueTitleKo;
  issue.clubs = uniq([...issue.clubs, ...a.clubs]);
  issue.players = uniq([...issue.players, ...(a.players ?? [])]);
  if (issue.sig.length === 0) issue.sig = articleSig(a); // 시드 기사 시그니처 고정 (눈덩이 병합 방지)
  a.issue = issue.slug;
}

// 병합되어 사라진 이슈 키 → 남은 이슈 키 (LLM이 옛 키를 다시 써도 같은 이슈로)
function aliasMap(issues) {
  const m = new Map();
  for (const i of issues.values()) for (const a of i.aliases ?? []) m.set(a, i.slug);
  return m;
}

const normTitle = (t) => (t ?? '').replace(/[\s·,.'"‘’“”…]/g, '');

/**
 * 같은 사건으로 보이는 최근 LLM 이슈를 하나로 합친다 (한국어 이슈 제목이 같은 경우).
 * 기사 수가 많은 쪽으로 합치고, 사라진 키는 aliases 에 남긴다. 반환: 병합 건수
 */
export function mergeDuplicateIssues(issues, now = Date.now()) {
  const groups = new Map();
  for (const i of issues.values()) {
    if (i.mode !== 'llm' || !i.titleKo || now - ts(i.updatedAt) > PIPELINE.issueMergeWindowHours * H) continue;
    const k = normTitle(i.titleKo);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  }
  let merged = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.articles.length - a.articles.length);
    const [keep, ...rest] = list;
    for (const r of rest) {
      for (const a of r.articles) if (!keep.articles.some((x) => x.id === a.id)) keep.articles.push(a);
      keep.articles.sort((x, y) => ts(x.publishedAt) - ts(y.publishedAt));
      keep.clubs = uniq([...keep.clubs, ...r.clubs]);
      keep.players = uniq([...(keep.players ?? []), ...(r.players ?? [])]);
      keep.aliases = uniq([...(keep.aliases ?? []), r.slug, ...(r.aliases ?? [])]);
      if (ts(r.updatedAt) > ts(keep.updatedAt)) keep.updatedAt = r.updatedAt;
      if (ts(r.createdAt) < ts(keep.createdAt)) keep.createdAt = r.createdAt;
      issues.delete(r.slug);
      merged++;
    }
  }
  return merged;
}

/** 새 기사들을 기존/신규 이슈에 배정한다. issues: Map<slug, issue> */
export function assignIssues(newArticles, issues, now = Date.now(), { rule = true } = {}) {
  const sorted = [...newArticles].sort((x, y) => ts(x.publishedAt) - ts(y.publishedAt));
  const aliases = aliasMap(issues);
  for (const a of sorted) {
    if (a.issue || a.offTopic) continue;
    if (a.issueKey) {
      let slug = slugify(a.issueKey);
      if (!slug) continue;
      slug = aliases.get(slug) ?? slug; // 병합된 옛 키면 남은 이슈로
      const existing = issues.get(slug);
      if (existing && ts(a.publishedAt) - ts(existing.updatedAt) > PIPELINE.issueMergeWindowHours * H) {
        slug = `${slug}-${a.publishedAt.slice(0, 10).replace(/-/g, '')}`;
      }
      const issue = issues.get(slug) ?? newIssue(slug, a, 'llm');
      issues.set(slug, issue);
      addToIssue(issue, a);
      continue;
    }
    if (a.enrichedBy === 'llm') continue; // LLM이 단일 사건이 아니라고 판단한 기사(라이브·가십 등)
    if (!rule) continue; // API 동작 중에는 규칙 기반 묶기 안 함
    // 규칙 기반: 고유명사·클럽 겹침으로 최근 이슈에 합류
    const sig = articleSig(a);
    if (sig.length < 2) continue;
    let best = null;
    let bestScore = 0;
    for (const issue of issues.values()) {
      if (issue.mode !== 'rule' || Math.abs(ts(a.publishedAt) - ts(issue.updatedAt)) > 36 * H) continue;
      const s = ruleMatchScore(sig, issue.sig);
      if (s > bestScore) [best, bestScore] = [issue, s];
    }
    if (!best) {
      const names = sig.slice(0, 3);
      let slug = slugify(`${names.join('-')}-${a.category}-${a.publishedAt.slice(0, 10)}`);
      while (issues.has(slug)) slug += '-x';
      best = newIssue(slug, a, 'rule');
      issues.set(slug, best);
    }
    addToIssue(best, a);
  }
}

/** 핫 트렌드 점수: 최근 창 내 매체별 (티어 가중치 × 시간 감쇠)의 합 + 이슈 메타 갱신 */
export function scoreIssue(issue, now = Date.now()) {
  const windowStart = now - PIPELINE.hotWindowHours * H;
  const firstBySource = new Map();
  for (const a of issue.articles) {
    const t = ts(a.publishedAt);
    if (t < windowStart || t > now + H) continue;
    const prev = firstBySource.get(a.source);
    const tier = tierOf(a);
    if (prev === undefined) firstBySource.set(a.source, { t, tier });
    else firstBySource.set(a.source, { t: Math.min(t, prev.t), tier: Math.min(tier, prev.tier) });
  }
  let score = 0;
  // 매체마다 한 번: 그 매체의 가장 이른 보도 시각 × 그 매체 보도 중 가장 높은 기사 티어
  for (const { t, tier } of firstBySource.values()) {
    const ageH = Math.max(0, (now - t) / H);
    score += TIER_WEIGHT[tier] * Math.pow(0.5, ageH / PIPELINE.decayHalfLifeHours);
  }
  const allSources = uniq(issue.articles.map((a) => a.source));
  issue.recentSources = firstBySource.size;
  issue.sourceCount = allSources.length;
  issue.score = Math.round(score * 100) / 100;
  issue.topTier = Math.min(...issue.articles.map(tierOf));

  // 이슈 분류: 기사 분류 다수결
  const votes = {};
  for (const a of issue.articles) if (a.category) votes[a.category] = (votes[a.category] ?? 0) + 1;
  issue.category = Object.entries(votes).sort((x, y) => y[1] - x[1])[0]?.[0] ?? issue.category;

  // 이적 단계 + 단계 변화 이력: 보도를 시간순으로 하나씩 더해가며 단계가 바뀐 지점을 기록
  issue.stageHistory = [];
  if (issue.category === 'transfer') {
    let prev = null;
    issue.articles.forEach((a, n) => {
      if (!a.stage) return;
      const cur = stageOf(issue.articles.slice(0, n + 1));
      if (cur !== prev) issue.stageHistory.push({ id: a.id, at: a.publishedAt, source: a.source, from: prev, to: cur });
      prev = cur;
    });
  }
  issue.stage = issue.category === 'transfer' ? issue.stageHistory.at(-1)?.to ?? 'interest' : null;
  const lastChange = issue.stageHistory.filter((h) => h.from).at(-1);
  issue.stageChange = lastChange ? { from: lastChange.from, to: lastChange.to, at: lastChange.at, source: lastChange.source } : null;

  // 선수 태그
  for (const a of issue.articles) delete a.koreans; // 구버전 필드 정리
  delete issue.koreans;
  issue.playerTags = uniq(issue.articles.flatMap((a) => [...(a.playerTags ?? []), ...tagPlayers(a.title, a.players ?? [])]));
  issue.transfer = issue.category === 'transfer' ? transferOf(issue) : null;

  // 최초 보도: 인용된 원 출처가 있으면 그것, 없으면 가장 이른 보도 매체
  const first = issue.articles[0];
  const credited = issue.articles.find((a) => a.credited)?.credited;
  issue.firstReport = credited
    ? { name: credited, at: first.publishedAt, viaQuote: true }
    : { name: SOURCE_BY_ID[first.source]?.name ?? first.source, source: first.source, at: first.publishedAt, viaQuote: false };

  // 대표 원문 제목: 최고 티어 매체의 가장 최근 기사
  const byTier = [...issue.articles].sort(
    (x, y) => tierOf(x) - tierOf(y) || ts(y.publishedAt) - ts(x.publishedAt),
  );
  issue.headline = byTier[0].title;
  return issue;
}

// 이적 대상: 기사별 LLM 추출값(선수·현 소속·행선지)의 최빈값. 추정으로 채우지 않는다 (잘못된 경로 노출 방지)
const mode = (vals) => {
  const c = {};
  for (const v of vals.filter(Boolean)) c[v] = (c[v] ?? 0) + 1;
  return Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
};
function transferOf(issue) {
  const t = issue.articles.map((a) => a.transfer).filter(Boolean);
  if (!t.length) return null;
  return { player: mode(t.map((x) => x.player)), from: mode(t.map((x) => x.from)), to: mode(t.map((x) => x.to)) };
}

// 이적 단계: 1~2티어 보도가 있으면 그중 가장 진전된 단계(최신 보도가 결렬이면 결렬), 없으면 최신 보도 기준
function stageOf(articles) {
  const staged = articles.filter((a) => a.stage);
  const credible = staged.filter((a) => tierOf(a) <= 2);
  let stage = staged.at(-1)?.stage ?? 'interest';
  if (credible.length) {
    stage =
      credible.at(-1).stage === 'collapsed'
        ? 'collapsed'
        : credible
            .map((a) => a.stage)
            .filter((s) => s !== 'collapsed')
            .sort((x, y) => STAGE_ORDER.indexOf(y) - STAGE_ORDER.indexOf(x))[0] ?? stage;
  }
  // 확정·결렬은 종료 판정과 같은 근거가 있을 때만 (T1 보도 또는 T1~T2 서로 다른 매체 2곳 이상)
  // 근거가 부족하면 보도된 진행 단계(관심·협상·합의) 중 가장 진전된 단계로 표시
  if ((stage === 'done' || stage === 'collapsed') && !confirmed(staged, stage)) {
    stage =
      staged
        .map((a) => a.stage)
        .filter((s) => s !== 'done' && s !== 'collapsed')
        .sort((x, y) => STAGE_ORDER.indexOf(y) - STAGE_ORDER.indexOf(x))[0] ?? 'interest';
  }
  return stage;
}

function confirmed(staged, stage) {
  const hits = staged.filter((a) => a.stage === stage);
  const t1 = hits.filter((a) => tierOf(a) === 1).length;
  const t12Sources = new Set(hits.filter((a) => tierOf(a) <= 2).map((a) => a.source)).size;
  return t1 >= ACCURACY.minT1Confirm || t12Sources >= ACCURACY.minT12Confirm;
}

export function pickHot(issues) {
  return [...issues]
    .filter((i) => i.recentSources >= PIPELINE.hotMinSources)
    .sort((a, b) => b.score - a.score)
    .slice(0, PIPELINE.hotCount)
    .map((i) => i.slug);
}
