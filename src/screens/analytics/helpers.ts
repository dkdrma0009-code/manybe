// AnalyticsScreen 라벨·색상 헬퍼와 인사이트 계산 — 화면 로직과 분리.
import { tokens } from '../../constants/tokens';
import { formatWon } from '../../utils/formatters';
import type { CreatorIntelligence } from '../../services/IntelligenceLayer';
import type { MemoryEntry } from '../../services/OperationalMemory';

export function riskColor(risk: 'high' | 'medium' | 'low'): string {
  return risk === 'high' ? tokens.urgent : risk === 'medium' ? tokens.reviewing : tokens.uploaded;
}

export function riskBg(risk: 'high' | 'medium' | 'low'): string {
  return risk === 'high' ? tokens.urgentBg : risk === 'medium' ? tokens.reviewingBg : tokens.uploadedBg;
}

export function riskLabel(risk: 'high' | 'medium' | 'low'): string {
  return risk === 'high' ? '높음' : risk === 'medium' ? '중간' : '낮음';
}

export function trendColor(trend: 'growing' | 'improving' | 'stable' | 'declining'): string {
  if (trend === 'growing' || trend === 'improving') return tokens.uploaded;
  if (trend === 'stable') return tokens.inProgress;
  return tokens.urgent;
}

export function trendLabel(trend: 'growing' | 'stable' | 'declining'): string {
  return trend === 'growing' ? '↑ 성장' : trend === 'stable' ? '→ 안정' : '↓ 하락';
}

export function rhythmLabel(rhythm: 'consistent' | 'sporadic' | 'declining'): string {
  return rhythm === 'consistent' ? '일정적' : rhythm === 'sporadic' ? '산발적' : '감소 중';
}

export function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    inquiry: '문의', reviewing: '검토중', in_progress: '진행중',
    uploaded: '업로드', settled: '정산완료',
  };
  return map[stage] ?? stage;
}

export function urgencyColor(u: 'critical' | 'high' | 'medium'): string {
  return u === 'critical' ? tokens.urgent : u === 'high' ? tokens.reviewing : tokens.inProgress;
}

export type HealthFactor = { name: string; impact: 'positive' | 'negative'; detail: string };
export type ToolResult<T> = { data: T; explanation: string; confidence: number };

export function explainHealthScore(
  intelligence: CreatorIntelligence,
  prevScore: number | null,
): ToolResult<{ score: number; factors: HealthFactor[] }> {
  const { personal: p, financial: f, relationship: r } = intelligence;
  const score = intelligence.compositeScore;
  const factors: HealthFactor[] = [];
  if (p.burnoutRisk === 'high')          factors.push({ name: '번아웃 위험', impact: 'negative', detail: '활성 협찬 과부하 + 정체 건수 많음' });
  if (f.monthlyTrend === 'declining')    factors.push({ name: '수익 감소', impact: 'negative', detail: '이번 달 수익이 전월 대비 감소' });
  if (r.dependencyRisk === 'high')       factors.push({ name: '브랜드 집중 위험', impact: 'negative', detail: '특정 브랜드 의존도 60% 초과' });
  if (f.revenueVolatility === 'high')    factors.push({ name: '수익 변동성 높음', impact: 'negative', detail: '월별 수익 편차가 큼' });
  if (p.activityRhythm === 'consistent') factors.push({ name: '일관된 활동', impact: 'positive', detail: '최근 꾸준히 협찬 완료' });
  if (f.settlementReliability >= 80)     factors.push({ name: '정산 신뢰도 높음', impact: 'positive', detail: `정산 완료율 ${f.settlementReliability}%` });
  if (f.monthlyTrend === 'growing')      factors.push({ name: '수익 성장', impact: 'positive', detail: '이번 달 수익이 전월 대비 증가' });
  const negFactors = factors.filter((fac) => fac.impact === 'negative').map((fac) => fac.name);
  const prevDiff = prevScore !== null ? score - prevScore : null;
  const explanation = prevDiff !== null
    ? `운영점수 ${score}점${prevDiff >= 0 ? ` (+${prevDiff})` : ` (${prevDiff})`}. ${negFactors.length ? `하락 요인: ${negFactors.join(', ')}.` : ''}`
    : `현재 운영점수 ${score}점. ${negFactors.length ? `주요 리스크: ${negFactors[0]}.` : '전반적으로 안정적이에요.'}`;
  return { data: { score, factors }, explanation, confidence: 85 };
}

export function forecastRevenueTool(
  intelligence: CreatorIntelligence,
): ToolResult<{ projected: number; confidence: number; trend: string }> {
  const { financial: f } = intelligence;
  const trendLabel2 = f.monthlyTrend === 'growing' ? '성장' : f.monthlyTrend === 'declining' ? '감소' : '안정';
  return {
    data: { projected: f.projectedThisMonth, confidence: f.forecastConfidence, trend: f.monthlyTrend },
    explanation: `예상 이번 달 수익 ${formatWon(f.projectedThisMonth)} (신뢰도 ${f.forecastConfidence}%). 트렌드: ${trendLabel2}.`,
    confidence: f.forecastConfidence,
  };
}

export function eventLabel(type: MemoryEntry['type']): { icon: string; label: string } {
  switch (type) {
    case 'recommendation_actioned':  return { icon: '✅', label: '추천 수락' };
    case 'recommendation_dismissed': return { icon: '✕', label: '추천 무시' };
    case 'deal_status_changed':      return { icon: '↔', label: '상태 변경' };
    case 'automation_fired':         return { icon: '⚡', label: '자동화 실행' };
  }
}
