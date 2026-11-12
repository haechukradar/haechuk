// 커리어 퀴즈 이름 자동완성 후보: 선수 사전 + 퀴즈 정답·보기 (가나다순)
import { PLAYERS } from '../../config/players.mjs';

export function careerNames(quizzes) {
  const set = new Set(PLAYERS.map((p) => p.ko));
  for (const q of quizzes) {
    set.add(q.answer);
    for (const o of q.options) set.add(o);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'ko'));
}
