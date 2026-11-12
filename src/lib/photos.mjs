// 선수 사진 (scripts/photos.mjs 가 받은 위키미디어 공용 자유 라이선스 사진) 조회
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

let db;
const load = () => (db ??= existsSync(path.resolve('data/photos.json')) ? JSON.parse(readFileSync(path.resolve('data/photos.json'), 'utf8')) : {});
const squash = (s) => (s ?? '').replace(/\s+/g, '');

/** 사전 선수 slug 또는 한글 이름으로 사진 찾기 → { file, author, license, ... } | null */
export function photoFor({ slug, ko } = {}) {
  const d = load();
  if (slug && d[slug]?.file) return d[slug];
  const k = squash(ko);
  if (!k) return null;
  const hits = Object.values(d).filter((p) => p.file && (squash(p.ko) === k || (k.length >= 2 && squash(p.ko).endsWith(k))));
  return hits.length === 1 ? hits[0] : null;
}

/** 출처 페이지용 전체 목록 */
export const allPhotos = () => Object.values(load()).filter((p) => p.file).sort((a, b) => a.ko.localeCompare(b.ko, 'ko'));
