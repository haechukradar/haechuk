// SPOCHAT 심층 해설 연결: 이슈 키(slug, /issue/ 뒤 주소) → SPOCHAT 글 주소·제목
// 매핑된 이슈의 상세 페이지 상단과 이슈 카드에 "📝 심층 해설 (SPOCHAT)" 배지가 붙는다.
export const COMMENTARY = {
  // 'rashford-barcelona-transfer': { url: 'https://blog.example.com/123', title: '래시포드 바르사행, 성사 가능성은?' },
};

const UTM = 'utm_source=haechuk&utm_medium=referral';

/** 매핑이 있으면 { url(UTM 포함), title }, 없으면 null */
export function commentaryFor(slug) {
  const c = COMMENTARY[slug];
  if (!c?.url) return null;
  return { title: c.title ?? 'SPOCHAT 심층 해설', url: c.url + (c.url.includes('?') ? '&' : '?') + UTM };
}
