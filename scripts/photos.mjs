// 선수 사진: 영어 위키백과 대표 사진(자유 라이선스만) → 위키미디어 공용 작성자·라이선스 확인 → 작은 썸네일을 public/photos 에 저장
// 기록: data/photos.json { 키: { file, title, author, license, licenseUrl, page } } — 화면에 출처 표시용
// 대상: 선수 사전 + 이적 보드 상위 선수 (사전에 없는 선수는 기사에서 뽑은 [원문, 한국어] 이름 짝으로 영어 이름을 찾음)
// 실행: npm run photos (이미 받은 선수는 건너뜀, --force 로 다시)
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { PLAYERS } from '../config/players.mjs';

const UA = 'haechuk-photo-fetch/1.0 (https://haechuk.net)';
const OUT_DIR = 'public/photos';
const DB = 'data/photos.json';
const force = process.argv.includes('--force');

const getJson = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};
const strip = (html) => (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const slugify = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** 영어 이름 → 위키백과 문서의 자유 라이선스 대표 사진 + 출처 */
async function lookup(enName) {
  const q = new URLSearchParams({
    action: 'query', titles: enName, redirects: '1', format: 'json', formatversion: '2',
    prop: 'pageimages|pageterms', piprop: 'name', pilicense: 'free', wbptterms: 'description',
  });
  const page = (await getJson(`https://en.wikipedia.org/w/api.php?${q}`)).query?.pages?.[0];
  if (!page || page.missing || !page.pageimage) return null;
  const desc = (page.terms?.description ?? []).join(' ');
  if (!/football|soccer/i.test(desc)) return null; // 동명이인 방지: 축구 선수 문서만
  const iq = new URLSearchParams({
    action: 'query', titles: `File:${page.pageimage}`, format: 'json', formatversion: '2',
    prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '160',
  });
  const info = (await getJson(`https://commons.wikimedia.org/w/api.php?${iq}`)).query?.pages?.[0]?.imageinfo?.[0];
  if (!info?.thumburl) return null;
  const m = info.extmetadata ?? {};
  const license = strip(m.LicenseShortName?.value);
  if (!/^(CC|Public domain|PD)/i.test(license)) return null; // 자유 라이선스만
  return {
    thumb: info.thumburl,
    title: page.title,
    author: strip(m.Artist?.value) || '작성자 미상',
    license,
    licenseUrl: m.LicenseUrl?.value ?? null,
    page: info.descriptionurl,
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const db = existsSync(DB) ? JSON.parse(await readFile(DB, 'utf8')) : {};

  // 대상 목록: 사전 선수 (키 = 사전 slug) + 이적 보드 상위 선수 (키 = 영어 이름 slug)
  const targets = PLAYERS.map((p) => ({ key: p.slug, en: p.full[0], ko: p.ko }));
  const issues = JSON.parse(await readFile('data/issues.json', 'utf8'));
  const koToEn = new Map();
  for (const f of (await readdir('data/articles')).sort().slice(-5)) {
    for (const a of JSON.parse(await readFile(path.join('data/articles', f), 'utf8'))) for (const [en, ko] of a.names ?? []) if (en && ko && !koToEn.has(ko)) koToEn.set(ko, en);
  }
  const transferPlayers = issues
    .filter((i) => i.category === 'transfer' && i.transfer?.player && !(i.playerTags ?? []).length)
    .sort((a, b) => (b.score ?? 0) + b.sourceCount - ((a.score ?? 0) + a.sourceCount))
    .slice(0, 40)
    .map((i) => i.transfer.player);
  for (const ko of new Set(transferPlayers)) {
    const en = koToEn.get(ko) ?? [...koToEn].find(([k]) => k.endsWith(ko) || ko.endsWith(k))?.[1];
    if (en && en.includes(' ')) targets.push({ key: slugify(en), en, ko });
  }

  let got = 0, miss = 0;
  for (const t of targets) {
    if (db[t.key]?.file && !force) continue;
    try {
      // 동명이인 문서에 걸리면 "(footballer)" 문서로 한 번 더
      const r = (await lookup(t.en)) ?? (await lookup(`${t.en} (footballer)`));
      if (!r) { db[t.key] = { none: true, en: t.en, ko: t.ko }; miss++; continue; }
      const res = await fetch(r.thumb, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`이미지 ${res.status}`);
      const ext = (r.thumb.match(/\.(jpe?g|png|webp)$/i)?.[1] ?? 'jpg').toLowerCase().replace('jpeg', 'jpg');
      const file = `${t.key}.${ext}`;
      await writeFile(path.join(OUT_DIR, file), Buffer.from(await res.arrayBuffer()));
      db[t.key] = { file: `/photos/${file}`, en: t.en, ko: t.ko, title: r.title, author: r.author, license: r.license, licenseUrl: r.licenseUrl, page: r.page };
      got++;
    } catch (e) {
      console.warn(`실패 ${t.en}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 300)); // 위키미디어 서버 부담 줄이기
  }
  await writeFile(DB, JSON.stringify(db, null, 1) + '\n');
  const total = Object.values(db);
  console.log(`새로 받은 사진 ${got} · 사진 없음 ${miss} · 전체 ${total.filter((x) => x.file).length}/${total.length}`);
}

main();
