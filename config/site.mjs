export const SITE = {
  name: '해축레이더',
  tagline: '해외 원 소스 축구 뉴스, 한국어로 실시간',
  url: 'https://haechuk.net',
  reportEmail: 'report@haechuk.net', // 오류 신고·삭제 요청 수신 (Cloudflare 이메일 라우팅으로 개인 메일에 전달)
  // 검색 노출 스위치. false = 모든 페이지 검색 제외(비공개 점검 기간), true = 검색 허용
  searchIndexing: false,
  // 검색엔진 소유 확인 코드 (서치어드바이저·서치콘솔이 주는 content 값만)
  verification: { naver: '', google: '' },
  cloudflareProject: 'haechuk', // Cloudflare Pages 프로젝트 이름 (*.pages.dev 미리보기 주소는 항상 검색 제외)
  spochatUrl: '', // SPOCHAT 블로그 주소 (있으면 푸터에 링크)
  ga4Id: '', // Google Analytics 4 측정 ID (예: G-XXXXXXX). 비어 있으면 스크립트 미삽입
  // 신문법 등록 대상 판정 시 기입 (최상위 화면 표시 의무)
  arrangementManager: '',
  youthProtectionManager: '',
};

// 파이프라인 파라미터
export const PIPELINE = {
  model: 'claude-haiku-5-5',
  maxItemAgeHours: 72, // 이보다 오래된 RSS 항목은 수집하지 않음
  maxEnrichPerRun: 240, // 1회 실행당 LLM 처리 최대 건수
  enrichBatchSize: 20, // 1회 요청 기사 수 (출력 한도에 걸리면 자동으로 반씩 나눠 재요청)
  hotWindowHours: 12, // 핫 트렌드 집계 창
  decayHalfLifeHours: 4, // 시간 감쇠 반감기
  hotMinSources: 2, // 핫 트렌드 최소 동시 보도 매체 수
  hotCount: 5,
  issueMergeWindowHours: 96, // 기존 이슈에 합류 가능한 기간
  thinIssuePruneDays: 14, // 기사 1건짜리 이슈는 이 기간 후 정리 (미종료 이적 이슈는 만료까지 유지)
  recentDays: 3, // 메인 피드·중복 판정에 쓰는 최근 일수
  ruleGroupingFallback: false, // API 키가 없을 때 규칙 기반 이슈 묶기 사용 여부 (정확도가 낮아 기본 끔)
};

// 매체 적중률 기록 (이슈 종료 판정·채점)
export const ACCURACY = {
  expireDays: 60, // 마지막 보도 후 이 기간 새 보도 없으면 만료(채점 안 함)
  minT1Confirm: 1, // 확정·결렬 판정: T1 매체 보도 최소 건수
  minT12Confirm: 2, // 또는 T1~T2 매체 보도 최소 건수
  minSampleForDisplay: 10, // 매체별 채점 표본이 이 이상일 때만 화면 노출 (현재 화면 미노출)
};

// X·텔레그램 발행 문구
export const OUTBOX = {
  count: 3, // 핫 트렌드 상위 N개
  maxWeighted: 280, // X 가중 글자 수 한도 (한글 등 2자, URL 23자)
};

// 이적 현황 보드
export const TRANSFERS = {
  activeDays: 30, // 관심·협상·합의 칸: 최근 갱신 기간
  closedDays: 14, // 확정·결렬 칸: 최근 기간
};
