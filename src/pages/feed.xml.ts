// 사이트 RSS: 핫 트렌드 이슈 (텔레그램 채널 연동·구독용)
import { loadData } from '../lib/data.mjs';
import { SITE } from '../../config/site.mjs';
import { STAGE_LABEL, CATEGORY_LABEL } from '../lib/labels.mjs';

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string);

export function GET() {
  const { meta, issueBySlug, pageIssues } = loadData();
  const base = SITE.url.replace(/\/$/, '');
  // 현재 핫 트렌드 + 최근 24시간 다매체 동시 보도 이슈 (최대 20개)
  const hot = meta.hot.map((s: string) => issueBySlug.get(s)).filter(Boolean);
  const recent = pageIssues
    .filter((i: any) => i.recentSources >= 2 && Date.now() - Date.parse(i.updatedAt) < 24 * 3600_000 && !hot.includes(i))
    .sort((a: any, b: any) => b.score - a.score);
  const items = [...hot, ...recent].slice(0, 20).map((i: any) => {
    const link = `${base}/issue/${i.slug}?utm_source=rss&utm_medium=feed`;
    const status = i.category === 'transfer' && i.stage ? `이적 단계: ${STAGE_LABEL[i.stage]}` : CATEGORY_LABEL[i.category] ?? '일반';
    return `<item><title>${esc(i.titleKo || i.headline)}</title><link>${esc(link)}</link><guid isPermaLink="false">${esc(i.slug)}</guid><pubDate>${new Date(i.updatedAt).toUTCString()}</pubDate><description>${esc(`${status} · ${i.sourceCount}개 매체 보도 · 최고 T${i.topTier}`)}</description></item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(SITE.name)} 핫 트렌드</title><link>${base}/</link><description>${esc(SITE.tagline)}</description><language>ko</language>${items.join('')}</channel></rss>`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
