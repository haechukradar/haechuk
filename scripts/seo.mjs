// 빌드 후 처리: dist/ 에 robots.txt, sitemap.xml, _headers(Cloudflare Pages) 를 만든다.
// 검색 노출 여부는 config/site.mjs 의 SITE.searchIndexing 하나로 정한다.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { SITE } from '../config/site.mjs';

const DIST = 'dist';
const base = SITE.url.replace(/\/$/, '');

// 사이트맵 대상: noindex 표시가 없는 HTML 페이지
function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const toPath = (file) => {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return null;
  return '/' + rel.replace(/\/index\.html$/, '').replace(/\.html$/, '');
};

// 검색 차단 중에는 모든 페이지에 noindex 가 붙으므로, 페이지 자체 noindex(내 기록·운영 페이지 등)는 경로로 거른다
const PRIVATE = ['/me', '/outbox', '/ops'];
const isPrivate = (p) => PRIVATE.some((x) => p === x || p.startsWith(x + '/'));

const urls = htmlFiles(DIST)
  .map((f) => ({ f, path: toPath(f) }))
  .filter(({ path }) => path && !isPrivate(path))
  .filter(({ f }) => !SITE.searchIndexing || !/<meta name="robots" content="noindex/.test(readFileSync(f, 'utf8')))
  .map(({ path }) => path)
  .sort();

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((p) => `  <url><loc>${xmlEscape(base + encodeURI(p))}</loc></url>`).join('\n') +
    `\n</urlset>\n`,
);

// 수집은 항상 허용하고 노출 제외는 noindex 로만 한다 (수집을 막으면 검색엔진이 noindex 표시를 못 읽어 주소만 색인될 수 있음)
writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n` + (SITE.searchIndexing ? `\nSitemap: ${base}/sitemap.xml\n` : ''),
);

// HTML 외 파일(RSS, JSON)까지 막기 위한 응답 헤더 (Cloudflare 기본 주소는 wrangler.jsonc 에서 꺼 둠)
writeFileSync(join(DIST, '_headers'), SITE.searchIndexing ? '' : '/*\n  X-Robots-Tag: noindex, nofollow\n');

console.log(`검색 노출: ${SITE.searchIndexing ? '허용' : '차단'} · 사이트맵 ${urls.length}개 페이지`);
