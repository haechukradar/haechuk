// 수집 대상 매체. tier: 1~4 (기획서 3장 신뢰도 티어), paywall: 유료 매체(🔒, 요약 미제공)
// league: 매체 기본 리그(클럽 태그가 없을 때 리그 필터에 사용), lang: 제목 언어
// 티어는 운영 중 적중률 데이터 기반으로 분기별 재조정한다.
export const SOURCES = [
  // 1티어
  { id: 'bbc', name: 'BBC Sport', tier: 1, lang: 'en', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
  // 2티어
  { id: 'guardian', name: 'Guardian', tier: 2, lang: 'en', url: 'https://www.theguardian.com/football/rss' },
  { id: 'sky', name: 'Sky Sports', tier: 2, lang: 'en', url: 'https://www.skysports.com/rss/12040' },
  { id: 'espn', name: 'ESPN', tier: 2, lang: 'en', url: 'https://www.espn.com/espn/rss/soccer/news' },
  { id: 'athletic', name: '디 애슬레틱', tier: 2, lang: 'en', paywall: true, url: 'https://www.nytimes.com/athletic/rss/football/' },
  { id: 'marca', name: '마르카', tier: 2, lang: 'es', league: 'laliga', url: 'https://e00-marca.uecdn.es/rss/futbol/primera-division.xml' },
  { id: 'as', name: 'AS', tier: 2, lang: 'es', league: 'laliga', url: 'https://feeds.as.com/mrss-s/pages/as/site/as.com/section/futbol/portada/' },
  { id: 'gazzetta', name: '가제타', tier: 2, lang: 'it', league: 'seriea', url: 'https://www.gazzetta.it/rss/calcio.xml' },
  { id: 'kicker', name: '키커', tier: 2, lang: 'de', league: 'bundesliga', url: 'https://newsfeed.kicker.de/news/fussball' },
  { id: 'lequipe', name: '레퀴프', tier: 2, lang: 'fr', league: 'ligue1', url: 'https://dwh.lequipe.fr/api/edito/rss?path=/Football/' },
  // 3티어
  { id: 'fblondon', name: 'Football.London', tier: 3, lang: 'en', league: 'epl', url: 'https://www.football.london/?service=rss' },
  { id: 'men', name: 'Manchester Evening News', tier: 3, lang: 'en', league: 'epl', url: 'https://www.manchestereveningnews.co.uk/sport/football/?service=rss' },
  { id: 'lecho', name: 'Liverpool Echo', tier: 3, lang: 'en', league: 'epl', url: 'https://www.liverpoolecho.co.uk/sport/football/?service=rss' },
  // 한국인 선수 소속 클럽 현지 매체 (2026-10-23 추가 — 상업적 이용 약관 확인 필요)
  { id: 'tz', name: 'tz (바이에른)', tier: 3, lang: 'de', league: 'bundesliga', url: 'https://www.tz.de/sport/fc-bayern/rssfeed.rdf' },
  { id: 'waz', name: 'WAZ (샬케)', tier: 3, lang: 'de', url: 'https://www.waz.de/sport/fussball/s04/rss' },
  { id: 'augsburger', name: '아우크스부르거 알게마이네', tier: 3, lang: 'de', league: 'bundesliga', url: 'https://www.augsburger-allgemeine.de/sport/fc-augsburg/rss' },
  { id: 'rp', name: 'RP 온라인 (묀헨글라트바흐)', tier: 3, lang: 'de', league: 'bundesliga', url: 'https://rp-online.de/sport/fussball/borussia/feed.rss' },
  { id: 'record', name: '헤코르드', tier: 2, lang: 'pt', url: 'https://www.record.pt/rss' },
  { id: 'fotomac', name: '포토마치 (베식타스)', tier: 3, lang: 'tr', url: 'https://www.fotomac.com.tr/rss/besiktas.xml' },
  { id: 'hln', name: 'HLN', tier: 3, lang: 'nl', url: 'https://www.hln.be/sport/voetbal/rss.xml' },
  { id: 'stoke', name: 'Stoke Sentinel', tier: 3, lang: 'en', url: 'https://www.stokesentinel.co.uk/sport/football/?service=rss' },
  { id: 'chronicle', name: 'Chronicle Live (뉴캐슬)', tier: 3, lang: 'en', league: 'epl', url: 'https://www.chroniclelive.co.uk/sport/football/?service=rss' },
  // 4티어
  { id: 'sun', name: 'The Sun', tier: 4, lang: 'en', url: 'https://www.thesun.co.uk/sport/football/feed/' },
  { id: 'star', name: 'Daily Star', tier: 4, lang: 'en', url: 'https://www.dailystar.co.uk/sport/football/?service=rss' },
  { id: 'mirror', name: 'Mirror', tier: 4, lang: 'en', url: 'https://www.mirror.co.uk/sport/football/?service=rss' },
  { id: 'fbinsider', name: 'Football Insider', tier: 4, lang: 'en', url: 'https://www.footballinsider247.com/feed/' },
];

export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

// 핫 트렌드 가중치 (상위 티어 매체 가중)
export const TIER_WEIGHT = { 1: 3, 2: 2, 3: 1.2, 4: 0.6 };

export const TIER_LABEL = {
  1: '공식·최상위 기자',
  2: '주요 일간지·방송',
  3: '지역지·클럽 전문',
  4: '타블로이드·루머',
};

// 매체 별칭 (LLM이 매체명을 영문·한글 등 여러 표기로 쓰므로 "자기 매체 인용" 판별에 사용)
const SOURCE_ALIASES = {
  bbc: ['BBC', 'BBC Sport', '비비씨'],
  guardian: ['The Guardian', '가디언'],
  sky: ['Sky Sports', 'Sky', 'Sky Sports News', 'Sky News', '스카이스포츠', '스카이 스포츠'],
  espn: ['ESPN', 'ESPN FC', 'ESPN UK'],
  athletic: ['The Athletic', 'Athletic', '디 애슬레틱', '애슬레틱'],
  marca: ['Marca', '마르카'],
  as: ['AS', 'Diario AS'],
  gazzetta: ['Gazzetta', 'La Gazzetta dello Sport', '가제타', '가체타'],
  kicker: ['kicker', '키커'],
  lequipe: ["L'Equipe", "L'Équipe", 'Lequipe', '레퀴프'],
  fblondon: ['Football.London', 'football london', '풋볼런던', '풋볼 런던'],
  men: ['Manchester Evening News', 'MEN', '맨체스터 이브닝 뉴스'],
  lecho: ['Liverpool Echo', '리버풀 에코'],
  tz: ['tz', 'tz.de'],
  waz: ['WAZ'],
  augsburger: ['Augsburger Allgemeine'],
  rp: ['RP Online', 'Rheinische Post', 'RP 온라인'],
  record: ['Record', '헤코르드', '레코드'],
  fotomac: ['Fotomaç', 'Fotomac', '포토마치'],
  hln: ['HLN', 'Het Laatste Nieuws'],
  stoke: ['Stoke Sentinel', 'StokeonTrentLive'],
  chronicle: ['Chronicle Live', 'Chronicle', '크로니클'],
  sun: ['The Sun', 'Sun', '더 선', '선'],
  star: ['Daily Star', '데일리 스타'],
  mirror: ['Mirror', 'Daily Mirror', '미러', '데일리 미러'],
  fbinsider: ['Football Insider', '풋볼 인사이더'],
};
const squash = (x) =>
  x
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9가-힣]/g, '')
    .replace(/(sports?|스포츠)$/, ''); // "BBC 스포츠" = "BBC Sport" = "BBC"

/** credited 값이 기사를 낸 매체 자신을 가리키는지 */
export function isOwnSource(sourceId, credited) {
  const s = SOURCE_BY_ID[sourceId];
  if (!s || !credited) return false;
  const c = squash(credited);
  if (!c) return true;
  return [s.name, s.id, ...(SOURCE_ALIASES[sourceId] ?? [])].map(squash).some((n) => n && (c === n || c === n.replace(/^the/, '')));
}
