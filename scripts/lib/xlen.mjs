// X(트위터) 가중 글자 수: 한글·한자·이모지 등은 2, 라틴 문자 등은 1, URL은 길이와 관계없이 23
const URL_RE = /https?:\/\/\S+/g;

// X의 1자 처리 범위 (twitter-text 기준: 라틴·일반 구두점 등)
const LIGHT = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037],
];

export function weightedLength(text) {
  let n = 0;
  const rest = text.replace(URL_RE, () => {
    n += 23;
    return '';
  });
  for (const ch of rest) {
    const cp = ch.codePointAt(0);
    n += LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2;
  }
  return n;
}
