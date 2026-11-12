// 빌드 시점 데이터 로더 (data/ 디렉터리의 수집 결과)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { SOURCE_BY_ID } from '../../config/sources.mjs';

const DATA = path.resolve('data');
const read = (f, fallback) => {
  const p = path.join(DATA, f);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback;
};

let cache;
export function loadData() {
  if (cache) return cache;
  const meta = read('meta.json', { hot: [], days: [], updatedAt: null });
  const issues = read('issues.json', []);
  const dir = path.join(DATA, 'articles');
  const days = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort().reverse()
    : [];
  // 이슈 상세 페이지: 2개 이상 매체가 다룬 이슈 + 모든 이적 이슈 (이적 보드 카드는 전부 이슈 페이지로 연결)
  // 매체 1곳짜리 이적 이슈 페이지는 검색 제외 (얇은 페이지 방지) — isIndexable
  const pageIssues = issues.filter((i) => i.sourceCount >= 2 || (i.category === 'transfer' && i.stage));
  const issueBySlug = new Map(pageIssues.map((i) => [i.slug, i]));
  cache = { meta, issues, pageIssues, issueBySlug, days };
  return cache;
}

export function loadDay(day) {
  return read(`articles/${day}.json`, []);
}

/** 최근 n일치 기사 (최신순) */
export function recentArticles(nDays = 3) {
  const { days } = loadData();
  return days
    .slice(0, nDays)
    .flatMap((d) => loadDay(d))
    .filter((a) => !a.offTopic)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export const sourceOf = (id) => SOURCE_BY_ID[id] ?? { id, name: id, tier: 4 };

/** 주간 퀴즈 목록 (최신순) */
export function loadQuizzes() {
  const dir = path.join(DATA, 'quiz');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .map((f) => read(`quiz/${f}`, null))
    .filter(Boolean);
}

/**
 * 커리어 퀴즈: 오늘(KST, 빌드 시점)까지 공개된 문제 (최신순). 미래 날짜 문제는 페이지를 만들지 않는다
 * all: 자동완성 후보용 전체 문제 (정답·보기 이름)
 */
export function loadCareerQuizzes() {
  const dir = path.join(DATA, 'career');
  if (!existsSync(dir)) return { published: [], all: [] };
  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const all = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .map((f) => read(`career/${f}`, null))
    .filter(Boolean);
  return { published: all.filter((q) => q.id <= today), all };
}

/** 종료 판정된 이적 이슈 (적중률 기록의 최신 판정) — 이적 예측 채점용 */
export function loadResolutions() {
  const latest = {};
  for (const e of read('accuracy-log.json', [])) latest[e.slug] = { result: e.result, at: e.resolvedAt, inferred: !!e.inferred, title: e.title };
  return latest;
}

/** 검색 노출 대상 이슈 페이지 (2개 이상 매체 보도) */
export const isIndexable = (issue) => issue.sourceCount >= 2;
