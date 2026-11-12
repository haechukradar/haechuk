// 퀴즈·등급·이적 예측 설정. 기록은 모두 사용자 브라우저(localStorage)에만 저장한다 (서버 없음).
// "티어"는 매체 신뢰도(T1~T4)에 쓰므로 사용자 단계는 "등급"으로 부른다.
export const GAME = {
  // 등급: 누적 점수 기준. minAcc가 있으면 최근 퀴즈 정답률도 그 이상이어야 한다 (쉬운 문제만 풀어 올리는 것 방지)
  grades: [
    { key: 'youth', name: '유스', min: 0 },
    { key: 'bench', name: '벤치', min: 100 },
    { key: 'starter', name: '주전', min: 300 },
    { key: 'captain', name: '캡틴', min: 700, minAcc: 0.6 },
    { key: 'legend', name: '레전드', min: 1500, minAcc: 0.7 },
  ],
  points: {
    correct: 10, // 퀴즈 정답 1개
    complete: 20, // 주간 퀴즈 완주
    streakStep: 10, // 연속 참여 주차마다 추가 (2주 연속 +10, 3주 +20 …)
    streakMax: 50, // 연속 참여 보너스 상한
    predictHit: 30, // 이적 예측 적중
    // 커리어 퀴즈(나 누구게?): 정답 기본 점수 - 힌트마다 감점 (최소 min), 이름을 직접 입력해 맞히면 배수
    career: { base: 15, hintPenalty: 3, min: 6, inputMultiplier: 2 },
  },
  recentQuizzes: 4, // 등급 정답률 기준에 쓰는 최근 퀴즈 수
  quizSize: 8, // 주간 퀴즈 문제 수 (데이터가 부족하면 적게 출제)

  // 이적 예측 문구 — 실존 인물 이름·유행어가 들어 있어 퍼블리시티권·상표 확인 후 사용. 바꾸려면 여기만 고치면 된다
  predict: {
    title: '이적 예측',
    tagline: '이제 너도 로마노?',
    pickDone: '✅ 성사된다',
    pickCollapsed: '❌ 무산된다',
    hitText: 'Here we go! 예측 적중 — 이제 너도 로마노',
    missText: '아쉽게 빗나갔어요',
  },
};
