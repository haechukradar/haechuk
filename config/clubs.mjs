// 클럽 사전. page: true 인 클럽만 클럽별 페이지 생성
// (1차 대상: EPL 빅6 + 한국인 선수 소속 클럽 — 소속 변동 시 갱신, 마지막 확인 2026-10-23)
// aliases: 제목 매칭용 (소문자, 단어 경계 매칭). 선수 성+클럽 복합 매칭에도 사용
export const LEAGUES = {
  epl: '프리미어리그',
  laliga: '라리가',
  seriea: '세리에A',
  bundesliga: '분데스리가',
  ligue1: '리그1',
  other: '기타',
};

export const CLUBS = [
  // EPL 빅6
  { slug: 'arsenal', ko: '아스널', league: 'epl', page: true, aliases: ['arsenal', 'gunners', 'arteta'] },
  { slug: 'chelsea', ko: '첼시', league: 'epl', page: true, aliases: ['chelsea'] },
  { slug: 'liverpool', ko: '리버풀', league: 'epl', page: true, aliases: ['liverpool', 'anfield'] },
  { slug: 'man-city', ko: '맨체스터 시티', league: 'epl', page: true, aliases: ['man city', 'manchester city', 'guardiola', 'etihad'] },
  { slug: 'man-utd', ko: '맨체스터 유나이티드', league: 'epl', page: true, aliases: ['man utd', 'man united', 'manchester united', 'old trafford', 'red devils'] },
  { slug: 'tottenham', ko: '토트넘', league: 'epl', page: true, aliases: ['tottenham', 'spurs'] },
  // 한국인 선수 소속 클럽 (페이지)
  { slug: 'lafc', ko: 'LAFC', league: 'other', page: true, aliases: ['lafc', 'los angeles fc', 'los angeles football club'], korean: '손흥민' },
  { slug: 'atletico', ko: '아틀레티코 마드리드', league: 'laliga', page: true, aliases: ['atletico', 'atlético', 'atleti', 'atletico madrid', 'atlético de madrid'], korean: '이강인' },
  { slug: 'bayern', ko: '바이에른 뮌헨', league: 'bundesliga', page: true, aliases: ['bayern', 'fc bayern', 'bayern munich', 'bayern münchen'], korean: '김민재' },
  { slug: 'mainz', ko: '마인츠', league: 'bundesliga', page: true, aliases: ['mainz', 'mainz 05', 'fsv mainz'], korean: '이재성' },
  { slug: 'porto', ko: 'FC 포르투', league: 'other', page: true, aliases: ['porto', 'fc porto', 'dragões', 'dragoes'], korean: '황인범' },
  // 한국인 선수 소속 클럽 (성+클럽 매칭·태깅용)
  { slug: 'schalke', ko: '샬케 04', league: 'other', aliases: ['schalke', 'schalke 04', 's04', 'königsblauen'] },
  { slug: 'augsburg', ko: '아우크스부르크', league: 'bundesliga', aliases: ['augsburg', 'fc augsburg'] },
  { slug: 'besiktas', ko: '베식타스', league: 'other', aliases: ['besiktas', 'beşiktaş', 'bjk', 'kara kartal'] },
  { slug: 'westerlo', ko: '베스테를로', league: 'other', aliases: ['westerlo', 'kvc westerlo'] },
  { slug: 'stoke', ko: '스토크 시티', league: 'other', aliases: ['stoke', 'stoke city', 'potters'] },
  { slug: 'brentford', ko: '브렌트퍼드', league: 'epl', aliases: ['brentford'] },
  { slug: 'newcastle', ko: '뉴캐슬', league: 'epl', aliases: ['newcastle', 'magpies', 'toon'] },
  { slug: 'gladbach', ko: '묀헨글라트바흐', league: 'bundesliga', aliases: ['gladbach', 'mönchengladbach', 'monchengladbach', 'borussia mönchengladbach', 'fohlen'] },
  { slug: 'club-brugge', ko: '클뤼프 브뤼허', league: 'other', aliases: ['club brugge', 'brugge', 'bruges'] },
  { slug: 'union-berlin', ko: '우니온 베를린', league: 'bundesliga', aliases: ['union berlin', '1. fc union', 'eisernen'] },
  { slug: 'midtjylland', ko: '미트윌란', league: 'other', aliases: ['midtjylland', 'fc midtjylland'] },
  { slug: 'swansea', ko: '스완지 시티', league: 'other', aliases: ['swansea', 'swansea city'] },
  { slug: 'birmingham', ko: '버밍엄 시티', league: 'other', aliases: ['birmingham', 'birmingham city'] },
  // 태깅·리그 판별용
  { slug: 'psg', ko: '파리 생제르맹', league: 'ligue1', aliases: ['psg', 'paris saint-germain', 'paris saint germain', 'paris sg'] },
  { slug: 'wolves', ko: '울버햄튼', league: 'epl', aliases: ['wolves', 'wolverhampton'] },
  { slug: 'feyenoord', ko: '페예노르트', league: 'other', aliases: ['feyenoord'] },
  { slug: 'aston-villa', ko: '애스턴 빌라', league: 'epl', aliases: ['aston villa'] },
  { slug: 'west-ham', ko: '웨스트햄', league: 'epl', aliases: ['west ham', 'hammers'] },
  { slug: 'brighton', ko: '브라이턴', league: 'epl', aliases: ['brighton'] },
  { slug: 'everton', ko: '에버턴', league: 'epl', aliases: ['everton'] },
  { slug: 'crystal-palace', ko: '크리스탈 팰리스', league: 'epl', aliases: ['crystal palace'] },
  { slug: 'nottingham-forest', ko: '노팅엄 포레스트', league: 'epl', aliases: ['nottingham forest'] },
  { slug: 'fulham', ko: '풀럼', league: 'epl', aliases: ['fulham'] },
  { slug: 'bournemouth', ko: '본머스', league: 'epl', aliases: ['bournemouth'] },
  { slug: 'real-madrid', ko: '레알 마드리드', league: 'laliga', aliases: ['real madrid', 'bernabeu', 'bernabéu'] },
  { slug: 'barcelona', ko: '바르셀로나', league: 'laliga', aliases: ['barcelona', 'barça', 'barca'] },
  { slug: 'inter', ko: '인터 밀란', league: 'seriea', aliases: ['inter milan', 'inter'] },
  { slug: 'ac-milan', ko: 'AC 밀란', league: 'seriea', aliases: ['ac milan'] },
  { slug: 'juventus', ko: '유벤투스', league: 'seriea', aliases: ['juventus', 'juve'] },
  { slug: 'napoli', ko: '나폴리', league: 'seriea', aliases: ['napoli'] },
  { slug: 'roma', ko: 'AS 로마', league: 'seriea', aliases: ['roma'] },
  { slug: 'dortmund', ko: '도르트문트', league: 'bundesliga', aliases: ['dortmund', 'bvb'] },
  { slug: 'leverkusen', ko: '레버쿠젠', league: 'bundesliga', aliases: ['leverkusen'] },
  { slug: 'leipzig', ko: '라이프치히', league: 'bundesliga', aliases: ['leipzig'] },
  { slug: 'marseille', ko: '마르세유', league: 'ligue1', aliases: ['marseille'] },
  { slug: 'monaco', ko: '모나코', league: 'ligue1', aliases: ['monaco'] },
];

export const CLUB_BY_SLUG = Object.fromEntries(CLUBS.map((c) => [c.slug, c]));
export const PAGE_CLUBS = CLUBS.filter((c) => c.page);
