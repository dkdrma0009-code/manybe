import { OperationalSnapshot } from '../hooks/useOperationalContext';
import { FocusItem } from './DecisionEngine';
import { BusinessGraph } from './BusinessGraph';

export interface CreatorStatePacket {
  generatedAt: string;
  version: string;
  // Metrics
  activeDeals: number;
  healthScore: number;
  // Key items
  criticalItems: string[];
  weeklyRisks: string[];
  topBrandRelationships: string[];
  forecastSummary: string;
  priorityItems: string[];   // TOP 3 titles
  // AI-ready compressed text
  systemPromptContext: string;
}

function fmtWon(n: number): string {
  if (n >= 100_000_000) return `${Math.floor(n / 100_000_000)}억원`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만원`;
  return n.toLocaleString('ko-KR') + '원';
}

export function exportCreatorState(
  snapshot: OperationalSnapshot,
  focusItems: FocusItem[],
  graph: BusinessGraph | null,
): CreatorStatePacket {
  const criticalItems = focusItems
    .filter((f) => f.urgency === 'critical')
    .map((f) => f.title);

  const weeklyRisks = snapshot.risks.map((r) => r.description);

  const topBrandRelationships = (graph?.nodes ?? [])
    .filter((n) => n.partnershipScore >= 60)
    .slice(0, 3)
    .map((n) => `${n.brand} (파트너십 ${n.partnershipScore}점, 협업 ${n.totalDeals}건)`);

  const forecastSummary = snapshot.forecast && snapshot.forecast.confidence !== 'low'
    ? `이번 달 예상 ${fmtWon(snapshot.forecast.thisMonthExpected)} (${
        snapshot.forecast.trend === 'up' ? '상승' :
        snapshot.forecast.trend === 'down' ? '하락' : '유지'
      } 트렌드)`
    : '수익 데이터 부족';

  const contextParts: string[] = [
    `활성 협찬 ${snapshot.activeDeals}건`,
    `운영점수 ${snapshot.healthScore}/100`,
  ];
  if (snapshot.overdueDeals > 0) contextParts.push(`마감 초과 ${snapshot.overdueDeals}건 긴급`);
  if (snapshot.pendingSettlement > 0) contextParts.push(`정산 지연 ${snapshot.pendingSettlement}건`);
  if (criticalItems.length > 0) contextParts.push(`우선순위: ${criticalItems.slice(0, 2).join(', ')}`);
  contextParts.push(forecastSummary);
  if (graph?.dependencyRisk === 'high' && graph.topBrand) {
    contextParts.push(`브랜드 의존도 위험 (${graph.topBrand} 집중)`);
  }

  return {
    generatedAt: new Date().toISOString(),
    version: '1.0',
    activeDeals: snapshot.activeDeals,
    healthScore: snapshot.healthScore,
    criticalItems,
    weeklyRisks,
    topBrandRelationships,
    forecastSummary,
    priorityItems: focusItems.slice(0, 3).map((f) => f.title),
    systemPromptContext: contextParts.join(' | '),
  };
}
