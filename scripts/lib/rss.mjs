import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';

const UA = 'Mozilla/5.0 (compatible; FootballRadarBot/0.1; +news aggregator)';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  htmlEntities: true,
  cdataPropName: false,
  trimValues: true,
});

const TRACKING_PARAMS = /^(utm_|fbclid|gclid|ito|cmp|at_medium|at_campaign|ns_|rss|ref$|src$)/i;

export function normalizeUrl(raw) {
  try {
    const u = new URL(raw.trim());
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (TRACKING_PARAMS.test(k)) u.searchParams.delete(k);
    u.protocol = 'https:';
    u.hostname = u.hostname.replace(/^www\./, '');
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim();
  }
}

export const articleId = (url) => createHash('sha1').update(normalizeUrl(url)).digest('hex').slice(0, 12);

const text = (v) => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === 'object') return text(v['#text'] ?? v['@_href'] ?? '');
  return '';
};

const cleanTitle = (t) =>
  t
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // 이스케이프된 CDATA (예: 헤코르드)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function pickLink(item) {
  if (typeof item.link === 'string') return item.link;
  const links = Array.isArray(item.link) ? item.link : [item.link];
  const alt = links.find((l) => l && (l['@_rel'] ?? 'alternate') === 'alternate') ?? links[0];
  return text(alt) || text(item.guid);
}

// 작성자: dc:creator / author (RSS는 "email (Name)" 형식도 있음, Atom은 {name})
function pickAuthor(item) {
  const raw = item['dc:creator'] ?? item.author ?? item['itunes:author'];
  const list = (Array.isArray(raw) ? raw : [raw]).map((r) => (r && typeof r === 'object' && r.name ? text(r.name) : text(r)));
  const names = list
    .map((n) => cleanTitle(n).replace(/^[^\s@]+@[^\s@]+\s*\((.+)\)$/, '$1').replace(/^[^\s@]+@[^\s@]+$/, '').replace(/^by\s+/i, '').trim())
    .filter((n) => n && n.length <= 80);
  return names.length ? names.join(', ') : null;
}

/**
 * RSS 2.0 / Atom 피드를 받아 제목·링크·발행시각·작성자 추출 (본문은 수집하지 않음)
 * desc: RSS description 앞부분. 선수 매칭·LLM 참고 맥락 전용 — 저장·노출 금지 (collect.mjs에서 저장 전 제거)
 */
export async function fetchFeed(source, { timeoutMs = 20000 } = {}) {
  const res = await fetch(source.url, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // 문자 인코딩: XML 선언 → Content-Type → UTF-8 순 (예: 헤코르드는 ISO-8859-1)
  const buf = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder('ascii').decode(buf.slice(0, 200));
  const charset =
    head.match(/encoding=["']([\w-]+)["']/i)?.[1] ?? res.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1] ?? 'utf-8';
  let xml;
  try {
    xml = new TextDecoder(charset).decode(buf);
  } catch {
    xml = new TextDecoder('utf-8').decode(buf);
  }
  const doc = parser.parse(xml);
  const rawItems = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.['rdf:RDF']?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  const out = [];
  for (const item of items) {
    const title = cleanTitle(text(item.title));
    const link = pickLink(item);
    if (!title || !link || !/^https?:/i.test(link)) continue;
    const dateStr = text(item.pubDate ?? item.published ?? item.updated ?? item['dc:date']);
    const ts = Date.parse(dateStr);
    out.push({
      id: articleId(link),
      url: link.trim(),
      title,
      source: source.id,
      publishedAt: Number.isFinite(ts) ? new Date(ts).toISOString() : null,
      author: pickAuthor(item),
      desc: cleanTitle(text(item.description ?? item.summary ?? '')).slice(0, 400),
    });
  }
  return out;
}
