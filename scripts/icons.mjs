// 매체 로고 아이콘(파비콘)을 받아 public/icons/src/{id}.png 로 저장한다. 매체를 추가했을 때 한 번 실행 (npm run icons)
// 방문자 브라우저가 외부 서비스에 요청하지 않도록 사이트에 함께 넣어 배포한다.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { SOURCES } from '../config/sources.mjs';

const DIR = 'public/icons/src';
mkdirSync(DIR, { recursive: true });
const force = process.argv.includes('--force');

for (const s of SOURCES) {
  const out = `${DIR}/${s.id}.png`;
  if (!s.site || (existsSync(out) && !force)) continue;
  const res = await fetch(`https://www.google.com/s2/favicons?domain=${s.site}&sz=64`);
  if (!res.ok) { console.warn(`실패: ${s.id} (${res.status})`); continue; }
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`저장: ${out}`);
}
