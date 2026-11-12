// 이적 보드·메인 이적 레이더 공용: 보드에 올릴 이적 이슈와 주목도
import { TRANSFERS, PIPELINE } from '../../config/site.mjs';
import { isKorean } from '../../config/players.mjs';

const D = 24 * 3600_000;
const closed = new Set(['done', 'collapsed']);
const lastMove = (i) => i.stageChange?.at ?? i.updatedAt;
// 종료된 이슈(확정·결렬·추론 결렬)는 판정 결과 칸에 놓는다
export const boardStage = (i) => (i.resolution && i.resolution.result !== 'expired' ? i.resolution.result : i.stage);
// 확정·결렬 칸은 종료 판정이 났거나 2개 이상 매체가 보도한 건만 (회고 기사 1건이 '확정'으로 보이는 것 방지)
const trusted = (i) => !closed.has(boardStage(i)) || !!i.resolution || i.sourceCount >= 2;

/** 주목도: 최근 다매체 보도 점수(핫 트렌드와 같은 계산) + 최근 단계 변화 + 보도 매체 수 + 최고 신뢰도 + 코리안리거 */
export function attentionOf(i, now = Date.now()) {
  const changedRecently = i.stageChange && now - Date.parse(i.stageChange.at) < 2 * D;
  const tierBonus = i.topTier === 1 ? 1.5 : i.topTier === 2 ? 0.8 : 0;
  const korean = (i.playerTags ?? []).some(isKorean) ? 1 : 0;
  return (i.score ?? 0) + (changedRecently ? 2 : 0) + Math.min(i.sourceCount, 6) * 0.4 + tierBonus + korean;
}

/** 보드 기간 안의 이적 이슈 (주목도 순) */
export function boardIssues(issues, now = Date.now()) {
  return issues
    .filter((i) => i.category === 'transfer' && i.stage && i.resolution?.result !== 'expired' && trusted(i))
    .filter((i) => {
      const st = boardStage(i);
      const age = now - Date.parse(closed.has(st) ? i.resolution?.at ?? lastMove(i) : i.updatedAt);
      return age < (closed.has(st) ? TRANSFERS.closedDays : TRANSFERS.activeDays) * D;
    })
    .map((i) => ({ issue: i, stage: boardStage(i), attention: attentionOf(i, now), moveAt: lastMove(i), hot: i.recentSources >= PIPELINE.hotMinSources }))
    .sort((a, b) => b.attention - a.attention || Date.parse(b.moveAt) - Date.parse(a.moveAt));
}
