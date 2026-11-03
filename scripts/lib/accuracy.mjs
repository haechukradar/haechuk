// 매체 적중률 기록: 이적 이슈 종료 판정 → 매체별 채점 → 추가 전용 로그 + 매체별 집계
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SOURCE_BY_ID } from '../../config/sources.mjs';
import { ACCURACY } from '../../config/site.mjs';

const H = 3600_000;
const ts = (iso) => Date.parse(iso);
const tierOf = (src) => SOURCE_BY_ID[src]?.tier ?? 4;
const round1 = (n) => Math.round(n * 10) / 10;

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
};

/** 확정·결렬 자동 판정: T1 보도 minT1Confirm건 이상 또는 T1~T2 보도 minT12Confirm건 이상이 처음 충족된 시각 */
export function detectClosure(issue, cfg = ACCURACY) {
  const counts = { done: { t1: 0, t12: 0 }, collapsed: { t1: 0, t12: 0 } };
  let rumored = false; // 확정·결렬 이전에 관심·협상·합의 보도가 있었는지 (루머가 결론 난 경우만 판정)
  for (const a of issue.articles) {
    if (['interest', 'negotiation', 'agreement'].includes(a.stage)) rumored = true;
    const c = counts[a.stage];
    if (!c) continue;
    const tier = tierOf(a.source);
    if (tier === 1) c.t1++;
    if (tier <= 2) c.t12++;
    if (rumored && (c.t1 >= cfg.minT1Confirm || c.t12 >= cfg.minT12Confirm)) return { result: a.stage, at: a.publishedAt };
  }
  return null;
}

// 이슈의 선수 식별 키 (사전 선수 slug 우선, 없으면 LLM이 뽑은 이적 대상 선수명)
const playerKeys = (issue) =>
  issue.playerTags?.length ? issue.playerTags.map((p) => `p:${p}`) : issue.transfer?.player ? [`n:${issue.transfer.player}`] : [];

/** 종료 시점까지의 보도로 매체별 채점 */
export function scoreResolution(issue, result, at) {
  const end = ts(at);
  const bySource = new Map();
  for (const a of issue.articles) {
    if (ts(a.publishedAt) > end) continue; // 종료 이후 보도(사후 보도)는 채점 제외
    if (!bySource.has(a.source)) bySource.set(a.source, []);
    bySource.get(a.source).push(a);
  }
  const scores = [];
  for (const [source, list] of bySource) {
    list.sort((x, y) => ts(x.publishedAt) - ts(y.publishedAt));
    const staged = list.filter((a) => a.stage);
    const last = staged.at(-1);
    if (!last) continue;
    const base = { source, tier: tierOf(source), lastStage: last.stage, author: last.author ?? null };
    if (last.stage === 'interest') {
      // 관심 단계에서 멈춘 매체: 사실 보도일 수 있으므로 적중률 모수에서 제외
      scores.push({ ...base, excluded: 'interest-only' });
      continue;
    }
    const prediction = last.stage === 'collapsed' ? 'fail' : 'success';
    const hit = (prediction === 'success') === (result === 'done');
    const firstSignal = staged.find((a) => a.stage !== 'interest');
    scores.push({ ...base, prediction, hit, firstSignalAt: firstSignal.publishedAt, leadHours: round1((end - ts(firstSignal.publishedAt)) / H) });
  }
  const scored = scores.filter((s) => !s.excluded);
  const correct = scored.filter((s) => s.hit).sort((x, y) => ts(x.firstSignalAt) - ts(y.firstSignalAt));
  return {
    scores,
    summary: {
      scored: scored.length,
      hits: correct.length,
      excluded: scores.length - scored.length,
      firstCorrect: correct[0] ? { source: correct[0].source, leadHours: correct[0].leadHours } : null,
    },
  };
}

// 시즌 구분 (KST 기준): 여름 이적시장 6~8월, 겨울 1월, 그 외 비시즌
export function seasonOf(iso) {
  const d = new Date(ts(iso) + 9 * H);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  if (m >= 6 && m <= 8) return `${y}-summer`;
  if (m === 1) return `${y}-winter`;
  return 'off-season';
}

function aggregate(latest) {
  const blank = () => ({ scored: 0, hits: 0, excludedInterest: 0, leadSum: 0, leadN: 0 });
  const bySource = {};
  let resolved = 0;
  for (const e of latest.values()) {
    if (e.result === 'expired' || e.result === 'void') continue;
    resolved++;
    const season = seasonOf(e.resolvedAt);
    for (const s of e.scores) {
      bySource[s.source] ??= { all: blank(), seasons: {} };
      const buckets = [bySource[s.source].all, (bySource[s.source].seasons[season] ??= blank())];
      for (const b of buckets) {
        if (s.excluded) {
          b.excludedInterest++;
          continue;
        }
        b.scored++;
        if (s.hit) {
          b.hits++;
          b.leadSum += s.leadHours;
          b.leadN++;
        }
      }
    }
  }
  const finish = (b) => ({
    scored: b.scored,
    hits: b.hits,
    rate: b.scored ? round1((b.hits / b.scored) * 100) : null,
    avgLeadHours: b.leadN ? round1(b.leadSum / b.leadN) : null, // 적중한 보도의 평균 리드 타임
    excludedInterest: b.excludedInterest,
  });
  const sources = {};
  for (const [src, v] of Object.entries(bySource)) {
    sources[src] = {
      name: SOURCE_BY_ID[src]?.name ?? src,
      tier: tierOf(src),
      all: finish(v.all),
      seasons: Object.fromEntries(Object.entries(v.seasons).map(([k, b]) => [k, finish(b)])),
      displayable: v.all.scored >= ACCURACY.minSampleForDisplay,
    };
  }
  return { resolvedIssues: resolved, sources };
}

const toResolution = (e) => ({
  result: e.result,
  at: e.resolvedAt,
  inferred: !!e.inferred,
  manual: !!e.manual,
  durationDays: e.durationDays,
  summary: e.summary ?? null,
});

/**
 * 이슈 종료 판정·채점 실행. issues: Map<slug, issue> (issue.resolution을 갱신)
 * @returns {{ added: object[] }}
 */
export async function runAccuracy(issues, { dataDir, now = Date.now(), resolutions = {}, cfg = ACCURACY }) {
  const logFile = path.join(dataDir, 'accuracy-log.json');
  const log = await readJson(logFile, []);
  const latest = new Map();
  for (const e of log) latest.set(e.slug, e); // 같은 slug는 마지막(최신 개정) 기록이 유효
  const added = [];

  const record = (issue, res, extra = {}) => {
    const prev = latest.get(issue.slug);
    const first = issue.articles[0]?.publishedAt ?? res.at;
    const scored = ['expired', 'void'].includes(res.result) ? { scores: [], summary: null } : scoreResolution(issue, res.result, res.at);
    const entry = {
      slug: issue.slug,
      title: issue.titleKo ?? issue.headline ?? issue.slug,
      players: issue.playerTags ?? [],
      transfer: issue.transfer ?? null,
      result: res.result,
      inferred: !!res.inferred,
      manual: !!res.manual,
      note: res.note ?? null,
      resolvedAt: res.at,
      firstReportAt: first,
      durationDays: round1((ts(res.at) - ts(first)) / (24 * H)),
      scoredAt: new Date(now).toISOString(),
      revision: prev ? (prev.revision ?? 0) + 1 : 0,
      ...(prev ? { previousResult: prev.result, changeReason: 'manual-resolution' } : {}),
      ...scored,
      ...extra,
    };
    log.push(entry);
    latest.set(issue.slug, entry);
    added.push(entry);
  };

  const transferIssues = [...issues.values()].filter((i) => i.category === 'transfer' && i.articles.length);

  // 1) 수동 판정 (자동보다 우선, 기존 판정과 다르면 재채점)
  for (const [slug, m] of Object.entries(resolutions)) {
    const issue = issues.get(slug);
    if (!issue || !['done', 'collapsed'].includes(m.result)) continue;
    const prev = latest.get(slug);
    const at = m.at ?? issue.updatedAt;
    if (prev && prev.manual && prev.result === m.result && prev.resolvedAt === at) continue;
    record(issue, { result: m.result, at, manual: true, note: m.note });
  }

  // 1-1) 판정 규칙이 바뀌어 더는 종료로 볼 수 없는 자동 판정은 무효 처리 (기록은 지우지 않고 개정 기록 추가)
  for (const issue of transferIssues) {
    const e = latest.get(issue.slug);
    if (!e || e.manual || e.inferred || !['done', 'collapsed'].includes(e.result)) continue;
    if (!detectClosure(issue, cfg)) record(issue, { result: 'void', at: e.resolvedAt, note: '판정 규칙 변경(앞선 이적설 없음)으로 무효' }, { changeReason: 'closure-rule' });
  }
  // 수동 판정으로도 무효 처리 가능 (config/resolutions.mjs 의 result: 'void')
  for (const [slug, m] of Object.entries(resolutions)) {
    const issue = issues.get(slug);
    if (!issue || m.result !== 'void' || latest.get(slug)?.result === 'void') continue;
    record(issue, { result: 'void', at: m.at ?? issue.updatedAt, manual: true, note: m.note });
  }

  // 2) 자동 확정·결렬
  for (const issue of transferIssues) {
    if (latest.has(issue.slug)) continue;
    const c = detectClosure(issue, cfg);
    if (c) record(issue, c);
  }

  // 3) 추론 결렬: 같은 선수의 다른 이적 이슈가 확정되면 그 선수의 미종료 이적 이슈를 결렬 처리
  const doneByPlayer = new Map();
  for (const e of latest.values()) {
    if (e.result !== 'done') continue;
    const issue = issues.get(e.slug);
    const keys = issue ? playerKeys(issue) : (e.players ?? []).map((p) => `p:${p}`);
    if (keys.length !== 1) continue; // 여러 선수가 얽힌 이슈(맞트레이드 등)는 추론에 쓰지 않음
    const prev = doneByPlayer.get(keys[0]);
    if (!prev || ts(e.resolvedAt) < ts(prev.resolvedAt)) doneByPlayer.set(keys[0], e);
  }
  for (const issue of transferIssues) {
    if (latest.has(issue.slug)) continue;
    for (const k of playerKeys(issue)) {
      const done = doneByPlayer.get(k);
      if (!done || done.slug === issue.slug) continue;
      if (ts(issue.articles[0].publishedAt) > ts(done.resolvedAt)) continue; // 확정 이후 시작된 이슈는 별개
      record(issue, { result: 'collapsed', at: done.resolvedAt, inferred: true }, { inferredFrom: done.slug });
      break;
    }
  }

  // 4) 만료: 마지막 보도 후 expireDays 동안 새 보도 없음 → 채점 없이 종료
  for (const issue of transferIssues) {
    if (latest.has(issue.slug)) continue;
    if (now - ts(issue.updatedAt) > cfg.expireDays * 24 * H) record(issue, { result: 'expired', at: issue.updatedAt });
  }

  for (const issue of issues.values()) {
    const e = latest.get(issue.slug);
    if (e && e.result !== 'void') issue.resolution = toResolution(e);
    else delete issue.resolution;
  }

  if (added.length || !log.length) await writeFile(logFile, JSON.stringify(log, null, 1) + '\n');
  await writeFile(
    path.join(dataDir, 'accuracy.json'),
    JSON.stringify({ generatedAt: new Date(now).toISOString(), minSampleForDisplay: cfg.minSampleForDisplay, ...aggregate(latest) }, null, 1) + '\n',
  );
  return { added };
}
