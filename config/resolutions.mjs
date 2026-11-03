// 이적 이슈 수동 판정. 자동 판정보다 우선한다.
// key: 이슈 키(slug, /issue/ 뒤 주소), result: 'done'(확정) | 'collapsed'(결렬) | 'void'(잘못 묶인 이슈 등 채점 제외)
// at: 종료 시각(ISO, 생략 시 이슈의 마지막 보도 시각), note: 근거 메모
// 이미 채점된 이슈의 판정을 바꾸면 다음 수집 때 재채점되고 accuracy-log에 개정 이력이 추가된다.
export const RESOLUTIONS = {
  // 'rashford-barcelona-transfer': { result: 'done', at: '2027-01-20T12:00:00Z', note: '구단 공식 발표' },
  'alvarez-barcelona-transfer': { result: 'void', note: '이적 결렬이 아니라 바르셀로나의 부당 접근 벌금(행정 처분) 기사들이 묶임 — 2026-11-03 운영자 판정' },
};
