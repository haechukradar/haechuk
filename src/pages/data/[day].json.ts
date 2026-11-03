// 아카이브 검색용 일자별 기사 데이터 (빌드 시 정적 JSON으로 생성)
import { loadData, loadDay } from '../../lib/data.mjs';

export function getStaticPaths() {
  return loadData().days.map((day: string) => ({ params: { day } }));
}

export function GET({ params }: { params: { day: string } }) {
  const { issueBySlug } = loadData();
  const rows = loadDay(params.day).filter((a: any) => !a.offTopic).map((a: any) => ({
    u: a.url,
    t: a.title,
    k: a.ko,
    s: a.source,
    p: a.publishedAt,
    l: a.league,
    c: a.clubs,
    pl: a.players,
    st: a.stage,
    pt: a.playerTags ?? a.koreans ?? [],
    i: a.issue && issueBySlug.has(a.issue) ? a.issue : null,
  }));
  return new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json' } });
}
