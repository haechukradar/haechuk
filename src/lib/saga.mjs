// 이슈 상세 "사가 요약"과 공유 텍스트 — 수집된 보도 기록(매체·시각·단계)에서만 계산, LLM 서술 없음
import { SOURCE_BY_ID } from '../../config/sources.mjs';
import { tierOf, bestReport } from '../../config/tiers.mjs';
import { SITE } from '../../config/site.mjs';
import { STAGE_LABEL, CATEGORY_LABEL, stageChangeInfo } from './labels.mjs';

const D = 24 * 3600_000;
const src = (id) => SOURCE_BY_ID[id] ?? { id, name: id, tier: 4 };

export function fmtDuration(hours) {
  if (hours < 1) return '1시간 이내';
  if (hours < 24) return `${Math.round(hours)}시간`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours - d * 24);
  return h ? `${d}일 ${h}시간` : `${d}일`;
}

/** 매체별 마지막 보도 단계 기준 방향 분포 */
export function directionOf(issue) {
  const last = new Map();
  for (const a of issue.articles) if (a.stage) last.set(a.source, a.stage);
  const out = { success: 0, fail: 0, interest: 0 };
  for (const st of last.values()) {
    if (st === 'collapsed') out.fail++;
    else if (st === 'interest') out.interest++;
    else out.success++;
  }
  return out;
}

export function sagaOf(issue, now = Date.now()) {
  const first = issue.articles[0];
  const base = {
    transfer: issue.transfer ?? null,
    first: { name: issue.firstReport.name, tier: first ? tierOf(first) : null, at: issue.firstReport.at },
    best: bestReport(issue.articles),
    sourceCount: issue.sourceCount,
  };
  const r = issue.resolution;
  if (r && r.result !== 'expired') {
    const fc = r.summary?.firstCorrect;
    return {
      ...base,
      status: 'resolved',
      result: r.result,
      inferred: r.inferred,
      manual: r.manual,
      resultText: r.inferred ? '다른 클럽 이적 확정으로 종료' : r.result === 'done' ? '확정' : '결렬',
      durationText: `${Math.max(1, Math.round(r.durationDays))}일 만에 ${r.result === 'done' ? '확정' : '결렬'}`,
      firstCorrect: fc ? { name: src(fc.source).name, tier: src(fc.source).tier, lead: fmtDuration(fc.leadHours) } : null,
      scored: r.summary?.scored ?? 0,
      hits: r.summary?.hits ?? 0,
      excluded: r.summary?.excluded ?? 0,
    };
  }
  return {
    ...base,
    status: r?.result === 'expired' ? 'expired' : 'ongoing',
    day: Math.floor((now - Date.parse(issue.firstReport.at)) / D) + 1,
    direction: directionOf(issue),
    change: issue.stageChange ? { ...issue.stageChange, info: stageChangeInfo(issue.stageChange) } : null,
  };
}

/**
 * 커뮤니티 공유용 텍스트. 단계 변화의 경과 시간은 복사 시점에 브라우저에서 채우도록 {{AGO}} 자리표시자를 둔다.
 */
export function shareTextOf(issue) {
  const title = issue.titleKo || issue.headline;
  const t = issue.transfer;
  const isTransfer = issue.category === 'transfer';
  const head = isTransfer && t?.player ? `[${t.player}${t.to ? ` → ${t.to}` : ''} 이적설 현황]` : `[${title}]`;
  const lines = [head];
  const r = issue.resolution;
  if (isTransfer && r && r.result !== 'expired') {
    const word = r.result === 'done' ? '확정' : '결렬';
    lines.push(`• 결과: ${r.inferred ? '결렬 (다른 클럽 이적 확정)' : word} · 첫 보도 후 ${Math.max(1, Math.round(r.durationDays))}일 만에 종료`);
  } else if (isTransfer && issue.stage) {
    const info = issue.stageChange ? stageChangeInfo(issue.stageChange) : null;
    lines.push(`• 현재 단계: ${STAGE_LABEL[issue.stage]}${info ? ` (${info.icon} {{AGO}} ${info.kind === 'up' ? '진전' : '변화'})` : ''}`);
  } else {
    lines.push(`• 분류: ${CATEGORY_LABEL[issue.category] ?? '일반'}`);
  }
  const first = issue.articles[0];
  lines.push(`• 최초 보도: ${issue.firstReport.name}${first ? ` (T${tierOf(first)})` : ''}`);
  const best = bestReport(issue.articles);
  lines.push(`• 보도 매체: ${best.name}(T${best.tier}${best.note ? `, ${best.note}` : ''})${issue.sourceCount > 1 ? ` 외 ${issue.sourceCount - 1}곳` : ''}`);
  const url = `${SITE.url.replace(/\/$/, '')}/issue/${issue.slug}?utm_source=share&utm_medium=community&utm_campaign=issue-${issue.slug}`;
  lines.push(`• 전체 흐름: ${url}`);
  return lines.join('\n');
}
