// X·텔레그램 발행 문구 생성 (KST 08:00 / 20:00 실행). X API는 쓰지 않고 운영자가 /outbox 페이지에서 복사해 게시.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SITE, OUTBOX } from '../config/site.mjs';
import { bestReport } from '../config/tiers.mjs';
import { STAGE_LABEL, CATEGORY_LABEL, stageChangeInfo, isRecentChange } from '../src/lib/labels.mjs';
import { weightedLength } from './lib/xlen.mjs';

const DATA = path.resolve('data');
const OUT_DIR = path.join(DATA, 'outbox');
export const SEPARATOR = '\n\n---\n\n';
const H = 3600_000;
const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

const now = Date.now();
const kst = new Date(now + 9 * H);
const day = kst.toISOString().slice(0, 10);
const half = kst.getUTCHours() < 12 ? 'am' : 'pm';
const label = `${kst.getUTCMonth() + 1}/${kst.getUTCDate()} ${half === 'am' ? '아침' : '저녁'}`;
const campaign = `hot3-${day.replace(/-/g, '')}-${half}`;

const issueUrl = (slug, source) =>
  `${SITE.url.replace(/\/$/, '')}/issue/${slug}?utm_source=${source}&utm_medium=social${source === 'x' ? `&utm_campaign=${campaign}` : ''}`;

function post(issue, rank, source) {
  const best = bestReport(issue.articles);
  const change = isRecentChange(issue.stageChange, now) ? stageChangeInfo(issue.stageChange) : null;
  const status =
    issue.category === 'transfer' && issue.stage
      ? `이적 단계: ${STAGE_LABEL[issue.stage]}${change ? ` ${change.icon}` : ''}`
      : `분류: ${CATEGORY_LABEL[issue.category] ?? '일반'}`;
  const tail = [status, `${issue.sourceCount}개 매체 보도 · 최고 T${best.tier} (${best.name})`, issueUrl(issue.slug, source)];
  let summary = issue.titleKo || issue.headline;
  const build = () => [`${NUM[rank]} ${summary}`, ...tail].join('\n');
  let text = build();
  if (weightedLength(text) > OUTBOX.maxWeighted) {
    // 한도 초과 시 요약을 줄임
    while (summary.length > 10 && weightedLength(build()) > OUTBOX.maxWeighted) summary = summary.slice(0, -2).trimEnd() + '…';
    console.warn(`⚠ ${rank + 1}번 글이 ${OUTBOX.maxWeighted}자를 넘어 요약을 줄였습니다: ${issue.slug}`);
    text = build();
  }
  return text;
}

export function buildThread(issues, hotSlugs, source = 'x') {
  const bySlug = new Map(issues.map((i) => [i.slug, i]));
  // 핫 트렌드 우선, 부족하면 최근 24시간 내 다매체 이슈를 점수순으로 보충
  const picked = hotSlugs.map((s) => bySlug.get(s)).filter(Boolean);
  for (const i of [...issues].sort((a, b) => b.score - a.score)) {
    if (picked.length >= OUTBOX.count) break;
    if (!picked.includes(i) && i.sourceCount >= 2 && now - Date.parse(i.updatedAt) < 24 * H) picked.push(i);
  }
  const top = picked.slice(0, OUTBOX.count);
  if (!top.length) return [];
  return [`🔥 지금 해외축구 핫 이슈 Top ${top.length} · ${label}`, ...top.map((i, n) => post(i, n, source))];
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chat) {
    console.log('텔레그램: 토큰·채널 설정 없음 → 건너뜀');
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: false }),
  });
  console.log(res.ok ? '텔레그램: 발송 완료' : `텔레그램: 발송 실패 (HTTP ${res.status})`);
}

async function main() {
  const issues = JSON.parse(await readFile(path.join(DATA, 'issues.json'), 'utf8'));
  const meta = JSON.parse(await readFile(path.join(DATA, 'meta.json'), 'utf8'));
  const thread = buildThread(issues, meta.hot ?? [], 'x');
  if (!thread.length) {
    console.log('발행할 이슈가 없습니다.');
    return;
  }
  let ok = true;
  thread.forEach((t, n) => {
    const len = weightedLength(t);
    if (len > OUTBOX.maxWeighted) ok = false;
    console.log(`${n + 1}번 글: ${len}/${OUTBOX.maxWeighted}자`);
  });
  await mkdir(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${day}-${half}.txt`);
  await writeFile(file, thread.join(SEPARATOR) + '\n');
  console.log(`저장: ${path.relative(process.cwd(), file)} ${ok ? '(글자 수 검증 통과)' : '(⚠ 글자 수 초과 글 있음)'}`);
  await sendTelegram(buildThread(issues, meta.hot ?? [], 'telegram').join('\n\n'));
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:')}` || process.argv[1]?.endsWith('outbox.mjs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
