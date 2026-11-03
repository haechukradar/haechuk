// 수집 → 한국어 가공 → 기사 묶기 → 점수 산정 파이프라인 (10~15분 주기 실행)
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SOURCES, SOURCE_BY_ID } from '../config/sources.mjs';
import { CLUB_BY_SLUG } from '../config/clubs.mjs';
import { tagPlayersDetailed, unknownPlayers, PLAYERS } from '../config/players.mjs';
import { NAMES, nameKey } from '../config/names.mjs';
import { ACCURACY, PIPELINE } from '../config/site.mjs';
import { RESOLUTIONS } from '../config/resolutions.mjs';
import { fetchFeed, normalizeUrl } from './lib/rss.mjs';
import { classify, tagClubs } from './lib/rules.mjs';
import { enrichBatch, llmAvailable, validIssueKey, PROMPT_VERSION } from './lib/enrich.mjs';
import { assignIssues, pickHot, scoreIssue, mergeDuplicateIssues } from './lib/issues.mjs';
import { runAccuracy } from './lib/accuracy.mjs';

const DATA = path.resolve('data');
const ARTICLES_DIR = path.join(DATA, 'articles');
const H = 3600_000;
const now = Date.now();

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeJson = (file, data) => writeFile(file, JSON.stringify(data, null, 1) + '\n');

// KST 기준 날짜 (아카이브 일자 구분)
const kstDate = (iso) => new Date(Date.parse(iso) + 9 * H).toISOString().slice(0, 10);

async function loadRecentArticles() {
  await mkdir(ARTICLES_DIR, { recursive: true });
  const files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith('.json')).sort();
  const recent = files.slice(-(PIPELINE.recentDays + 2));
  const byDay = new Map();
  for (const f of recent) byDay.set(f.replace('.json', ''), await readJson(path.join(ARTICLES_DIR, f), []));
  return { byDay, allDays: files.map((f) => f.replace('.json', '')) };
}

// 선수 태그 + 매칭 근거 기록 (description은 수집 시점에만 있으므로 그 근거로 붙은 태그는 이후 재태깅에서 유지)
function setPlayerTags(a, llmPlayers = []) {
  const found = tagPlayersDetailed(a.title, llmPlayers, a.desc ?? '');
  a.playerTags = found.map((t) => t.slug);
  a.playerVia = Object.fromEntries(found.map((t) => [t.slug, t.via]));
}

function ruleEnrich(a) {
  const { category, stage } = classify(a.title);
  const clubs = tagClubs(a.title);
  const leagues = clubs.map((c) => CLUB_BY_SLUG[c]?.league).filter(Boolean);
  Object.assign(a, {
    ko: null,
    category,
    stage,
    clubs,
    otherClubs: [],
    players: [],
    managers: [],
    league: leagues[0] ?? SOURCE_BY_ID[a.source]?.league ?? null,
    credited: null,
    issueKey: null,
    issueTitleKo: null,
    enrichedBy: 'rule',
    transfer: null,
  });
  setPlayerTags(a);
}

function applyLlm(a, r) {
  const paywall = SOURCE_BY_ID[a.source]?.paywall;
  const clubs = [...new Set(r.clubs)];
  Object.assign(a, {
    ko: paywall ? null : r.ko, // 유료 매체는 요약 미제공 (제목·링크만)
    category: r.category,
    stage: r.category === 'transfer' ? r.stage : null,
    clubs,
    otherClubs: r.other_clubs,
    players: r.players,
    managers: r.managers,
    league: r.league ?? CLUB_BY_SLUG[clubs[0]]?.league ?? SOURCE_BY_ID[a.source]?.league ?? null,
    credited: r.credited,
    issueKey: r.issue_key,
    issueTitleKo: r.issue_title_ko,
    enrichedBy: 'llm',
    promptVersion: PROMPT_VERSION,
    names: r.name_map?.length ? r.name_map.map((n) => [n.en, n.ko]) : undefined, // 표기 점검용 [원문, 한국어]
    offTopic: r.is_football === false ? true : undefined, // 축구 외 기사: 피드·이슈·퀴즈에서 제외
    transfer: r.transfer,
  });
  setPlayerTags(a, r.players);
}

async function main() {
  const t0 = Date.now();
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN && process.env.NO_LLM !== '1') {
    console.warn('');
    console.warn('⚠⚠ ANTHROPIC_API_KEY 가 없습니다. 한국어 요약·이슈 묶기 없이 원문 제목으로만 수집합니다.');
    console.warn('   프로젝트 폴더의 .env 파일에 ANTHROPIC_API_KEY=키 를 넣어 두면 자동으로 읽습니다.');
    console.warn('');
  }
  const { byDay, allDays } = await loadRecentArticles();
  const known = new Map();
  for (const list of byDay.values()) for (const a of list) known.set(a.id, a);
  const knownUrls = new Set([...known.values()].map((a) => normalizeUrl(a.url)));

  // 1. 수집
  const feedStats = {};
  const results = await Promise.allSettled(SOURCES.map((s) => fetchFeed(s)));
  const fresh = [];
  results.forEach((r, i) => {
    const src = SOURCES[i];
    if (r.status === 'rejected') {
      feedStats[src.id] = { ok: false, error: String(r.reason?.message ?? r.reason) };
      console.warn(`✗ ${src.name}: ${feedStats[src.id].error}`);
      return;
    }
    // 작성자 칸에 매체명만 있는 경우(예: 헤코르드의 "Record")는 기자 정보가 아니므로 비움
    for (const item of r.value) {
      const au = item.author?.toLowerCase();
      if (au && (src.name.toLowerCase().includes(au) || au === src.id || au.replace(/\s+/g, '') === src.id)) item.author = null;
    }
    let added = 0;
    for (const item of r.value) {
      const nu = normalizeUrl(item.url);
      if (known.has(item.id) || knownUrls.has(nu)) continue; // 중복 URL 제거
      item.publishedAt ??= new Date(now).toISOString();
      const age = now - Date.parse(item.publishedAt);
      if (age > PIPELINE.maxItemAgeHours * H) continue;
      if (age < -H) item.publishedAt = new Date(now).toISOString(); // 미래 시각 보정
      item.collectedAt = new Date(now).toISOString();
      knownUrls.add(nu);
      known.set(item.id, item);
      fresh.push(item);
      added++;
    }
    const withAuthor = r.value.filter((x) => x.author).length;
    feedStats[src.id] = { ok: true, items: r.value.length, added, authorRate: r.value.length ? Math.round((withAuthor / r.value.length) * 100) : 0 };
  });
  console.log(`수집: 신규 ${fresh.length}건 (${Object.values(feedStats).filter((s) => s.ok).length}/${SOURCES.length} 피드 성공)`);

  // 2. 한국어 가공: 규칙 태깅 후 LLM 보강 (최신순, 1회 상한)
  for (const a of fresh) ruleEnrich(a);
  const issuesFile = path.join(DATA, 'issues.json');
  const issues = new Map((await readJson(issuesFile, [])).map((i) => [i.slug, i]));

  // 가공 대기열 (1회 상한 안에서): ① 새 기사 → ② 아직 LLM 가공 안 된 기사 → ③ (--reenrich) 이전 지시문 버전으로 가공된 기사
  // 평소엔 ②를 최근 24시간까지, --reenrich 면 수집 범위(72시간) 전체로 넓힌다
  const reenrich = process.argv.includes('--reenrich');
  const byNewest = (x, y) => Date.parse(y.publishedAt) - Date.parse(x.publishedAt);
  const within = (a, hours) => now - Date.parse(a.publishedAt) < hours * H;
  const pending = [...known.values()]
    .filter((a) => !fresh.includes(a) && a.enrichedBy === 'rule' && within(a, reenrich ? PIPELINE.maxItemAgeHours : 24))
    .sort(byNewest);
  const outdated = reenrich
    ? [...known.values()]
        .filter((a) => !fresh.includes(a) && a.enrichedBy === 'llm' && a.promptVersion !== PROMPT_VERSION && within(a, PIPELINE.maxItemAgeHours))
        .sort(byNewest)
    : [];
  const queue = [...fresh.sort(byNewest), ...pending, ...outdated].slice(0, PIPELINE.maxEnrichPerRun);
  if (reenrich) console.log(`다시 가공 대상: 미가공 ${pending.length}건, 이전 지시문 ${outdated.length}건 (이번 실행 최대 ${PIPELINE.maxEnrichPerRun}건)`);
  let llmCount = 0;
  if (queue.length && llmAvailable()) {
    for (let i = 0; i < queue.length && llmAvailable(); i += PIPELINE.enrichBatchSize) {
      const batch = queue.slice(i, i + PIPELINE.enrichBatchSize);
      const active = [...issues.values()]
        .filter((x) => x.mode === 'llm' && validIssueKey(x.slug.replace(/-\d{8}$/, '')) && now - Date.parse(x.updatedAt) < PIPELINE.issueMergeWindowHours * H)
        .sort((x, y) => (y.score ?? 0) - (x.score ?? 0))
        .map((x) => ({ slug: x.slug, titleKo: x.titleKo ?? x.headline }));
      const res = await enrichBatch(batch, active);
      for (const a of batch) {
        const r = res.get(a.id);
        if (!r) continue;
        if (a.issue && !fresh.includes(a)) {
          // 규칙 이슈에 들어가 있던 기사를 LLM 결과로 재배정
          const old = issues.get(a.issue);
          if (old) old.articles = old.articles.filter((x) => x.id !== a.id);
          a.issue = null;
        }
        applyLlm(a, r);
        llmCount++;
      }
      // 같은 실행 안의 다음 배치가 새 이슈 key를 재사용할 수 있게 즉시 배정
      assignIssues(batch.filter((a) => a.enrichedBy === 'llm'), issues, now);
    }
  }
  console.log(`가공: LLM ${llmCount}건${llmAvailable() ? '' : ' (LLM 미사용 — 규칙 기반)'}`);

  // 선수 태깅 (사전 변경 시 최근 기사에도 반영되도록 매번 전체 재태깅)
  const candidates = {};
  for (const a of known.values()) {
    delete a.koreans; // 구버전 필드
    const prevVia = a.playerVia ?? {};
    const found = tagPlayersDetailed(a.title, a.players ?? [], a.desc ?? '');
    const via = Object.fromEntries(found.map((t) => [t.slug, t.via]));
    // description 맥락으로 붙은 태그는 description이 저장되지 않으므로 그대로 유지
    for (const [slug, v] of Object.entries(prevVia)) if (!via[slug] && (v.includes('(desc)') || v === 'surname+club')) via[slug] = v;
    a.playerTags = Object.keys(via);
    a.playerVia = via;
    for (const n of unknownPlayers(a.players ?? [])) candidates[n] = (candidates[n] ?? 0) + 1;
  }
  // 인명 표기 점검: 같은 원문 이름이 여러 한글 표기로 쓰였거나, 사전과 다르게 쓰인 경우
  const dictByKey = new Map();
  for (const n of NAMES) for (const en of n.en) dictByKey.set(nameKey(en), n.ko);
  for (const p of PLAYERS) for (const en of p.full) dictByKey.set(nameKey(en), p.ko);
  const variants = new Map(); // key -> { en, ko: {표기: 횟수} }
  for (const a of known.values()) {
    if (a.offTopic || !a.names || !within(a, PIPELINE.maxItemAgeHours)) continue;
    for (const [en, ko] of a.names) {
      const k = nameKey(en);
      if (!k || !ko) continue;
      const v = variants.get(k) ?? { en, ko: {} };
      v.ko[ko] = (v.ko[ko] ?? 0) + 1;
      variants.set(k, v);
    }
  }
  // 성만 쓴 표기는 같은 사람으로 본다 (예: "킬리안 음바페" ↔ "음바페")
  const sameName = (a, b) => a === b || a.endsWith(' ' + b) || b.endsWith(' ' + a);
  const nameReport = [];
  for (const [k, v] of variants) {
    const forms = Object.keys(v.ko);
    const dict = dictByKey.get(k);
    const offDict = dict ? forms.filter((f) => !sameName(f, dict)) : [];
    const distinct = forms.filter((f, i) => !forms.slice(0, i).some((g) => sameName(f, g)));
    if (offDict.length || distinct.length > 1)
      nameReport.push({ en: v.en, dictionary: dict ?? null, variants: Object.entries(v.ko).sort((x, y) => y[1] - x[1]).map(([ko, count]) => ({ ko, count })) });
  }
  nameReport.sort((a, b) => b.variants.reduce((s, x) => s + x.count, 0) - a.variants.reduce((s, x) => s + x.count, 0));
  if (nameReport.length) console.log(`인명 표기 점검: ${nameReport.length}명 (/ops/names 에서 확인)`);

  // 사전에 없는데 최근 자주 언급된 선수 → 명단 추가 후보
  const playerCandidates = Object.entries(candidates)
    .filter(([, n]) => n >= 3)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 30)
    .map(([name, count]) => ({ name, count }));
  if (playerCandidates.length)
    console.log(`선수 명단 추가 후보: ${playerCandidates.slice(0, 8).map((c) => `${c.name}(${c.count})`).join(', ')}`);

  // 3. 기사 묶기 — API가 동작하면 규칙 기반 묶기는 하지 않음 (가공 실패분은 다음 수집 때 다시 가공해 묶음)
  const ruleGrouping = !llmAvailable() && PIPELINE.ruleGroupingFallback;
  assignIssues(fresh, issues, now, { rule: ruleGrouping });

  // 3-1. 같은 사건 이슈 병합 (한국어 이슈 제목이 같은 경우) + 기사 연결 갱신
  const mergedCount = mergeDuplicateIssues(issues, now);
  if (mergedCount) {
    const toKeep = new Map();
    for (const i of issues.values()) for (const al of i.aliases ?? []) toKeep.set(al, i.slug);
    for (const a of known.values()) if (a.issue && toKeep.has(a.issue)) a.issue = toKeep.get(a.issue);
    console.log(`같은 사건 이슈 병합: ${mergedCount}건`);
  }

  // 4. 점수 산정 + 정리
  for (const [slug, issue] of issues) {
    if (issue.articles.length === 0) {
      issues.delete(slug);
      continue;
    }
    scoreIssue(issue, now);
    const age = now - Date.parse(issue.updatedAt);
    // 미종료 이적 이슈는 적중률 채점(또는 만료 판정)까지 유지
    const pendingTransfer = issue.category === 'transfer' && !issue.resolution && age <= ACCURACY.expireDays * 24 * H;
    const thin = issue.sourceCount < 2 && age > PIPELINE.thinIssuePruneDays * 24 * H && !pendingTransfer;
    if (thin) issues.delete(slug);
  }

  // 4-1. 이적 이슈 종료 판정 + 매체 적중률 채점 (추가 전용 기록)
  const { added } = await runAccuracy(issues, { dataDir: DATA, now, resolutions: RESOLUTIONS });
  if (added.length) console.log(`적중률 기록: ${added.map((e) => `${e.slug}=${e.result}${e.inferred ? '(추론)' : ''}`).join(', ')}`);
  const issueList = [...issues.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  // 이슈 상태 자동 점검: 너무 넓은 이슈(3일 안에 기사 15건 이상)와 너무 좁은 이슈(기사 1건) 비율
  const recentLlm = issueList.filter((i) => i.mode === 'llm' && now - Date.parse(i.updatedAt) < 72 * H);
  const issueHealth = {
    recentIssues: recentLlm.length,
    singleArticleRate: recentLlm.length ? Math.round((recentLlm.filter((i) => i.articles.length === 1).length / recentLlm.length) * 100) : null,
    broad: recentLlm
      .map((i) => ({ slug: i.slug, count: i.articles.filter((a) => now - Date.parse(a.publishedAt) < 72 * H).length }))
      .filter((x) => x.count >= 15)
      .sort((a, b) => b.count - a.count),
  };
  if (issueHealth.broad.length) console.warn(`⚠ 너무 넓은 이슈: ${issueHealth.broad.map((b) => `${b.slug}(${b.count})`).join(', ')}`);
  const hot = pickHot(issueList);

  // 5. 저장: 기사는 KST 일자별 파일, 이슈는 단일 파일
  const touched = new Set();
  for (const a of known.values()) {
    if (a.issue === undefined) a.issue = null;
    const day = kstDate(a.publishedAt);
    if (!byDay.has(day)) byDay.set(day, []);
  }
  for (const day of byDay.keys()) byDay.set(day, []);
  for (const a of known.values()) {
    // 임시 필드는 저장하지 않음. desc(RSS description)는 저작권 원칙상 저장 금지
    const { issueKey, issueTitleKo, desc, ...stored } = a;
    byDay.get(kstDate(a.publishedAt)).push(stored);
    touched.add(kstDate(a.publishedAt));
  }
  for (const day of touched) {
    const list = byDay.get(day).sort((x, y) => Date.parse(y.publishedAt) - Date.parse(x.publishedAt));
    await writeJson(path.join(ARTICLES_DIR, `${day}.json`), list);
  }
  await writeJson(issuesFile, issueList);

  const days = [...new Set([...allDays, ...touched])].sort();
  const meta = await readJson(path.join(DATA, 'meta.json'), {});
  const todayKst = kstDate(new Date(now).toISOString());
  const daily = meta.daily ?? {};
  daily[todayKst] = { collected: (daily[todayKst]?.collected ?? 0) + fresh.length, llm: (daily[todayKst]?.llm ?? 0) + llmCount };
  await writeJson(path.join(DATA, 'meta.json'), {
    updatedAt: new Date(now).toISOString(),
    hot,
    days,
    feeds: feedStats,
    playerCandidates,
    issueHealth,
    nameReport: nameReport.slice(0, 50),
    daily: Object.fromEntries(Object.entries(daily).sort().slice(-60)), // KPI: 일 수집 기사 수
  });
  console.log(`이슈 ${issueList.length}개, 핫 트렌드 ${hot.length}개 — ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
