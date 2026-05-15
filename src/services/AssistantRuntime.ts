// Tool-call ready operational APIs for future conversational AI integration.
// All functions are pure and return ToolResult<T> — structured data + explanation + confidence.
// Schema designed to be directly serializable as LLM function responses.

import { AutomationDeal, AutomationInquiry } from './AutomationEngine';
import { CreatorIntelligence } from './IntelligenceLayer';
import { MorningBriefing } from '../types/autonomous';
import { FocusItem } from './DecisionEngine';
import { BusinessGraph } from './BusinessGraph';
import { MemoryEntry } from './OperationalMemory';

// ─── Result envelope ──────────────────────────────────────────────────────────

export interface ToolResult<T = unknown> {
  data: T;
  explanation: string;
  confidence: number; // 0–100
  computedAt: string;
}

function result<T>(data: T, explanation: string, confidence: number): ToolResult<T> {
  return { data, explanation, confidence, computedAt: new Date().toISOString() };
}

function formatWon(n: number): string {
  if (n >= 100_000_000) return `${Math.floor(n / 100_000_000)}억원`;
  if (n >= 10_000)      return `${Math.floor(n / 10_000)}만원`;
  return n.toLocaleString('ko-KR') + '원';
}

// ─── Tool: "이번 주 가장 위험한 협찬 알려줘" ─────────────────────────────────

export type RiskyDeal = { dealId?: string; brand: string; risk: string; severity: 'critical' | 'high' | 'medium' };

export function getRiskyDeals(
  deals: AutomationDeal[],
  inquiries: AutomationInquiry[],
): ToolResult<RiskyDeal[]> {
  const now  = Date.now();
  const risks: RiskyDeal[] = [];

  for (const deal of deals) {
    if (deal.status === 'settled') continue;
    const last = deal.updated_at ?? deal.created_at;
    const days = Math.floor((now - new Date(last).getTime()) / 86_400_000);
    if (days >= 14) risks.push({ dealId: deal.id, brand: deal.brand, risk: `${days}일 정체`, severity: 'critical' });
    else if (days >= 7) risks.push({ dealId: deal.id, brand: deal.brand, risk: `${days}일 정체`, severity: 'high' });
    if (deal.status === 'uploaded') {
      const uploadDays = Math.floor((now - new Date(deal.created_at).getTime()) / 86_400_000);
      if (uploadDays >= 30) risks.push({ dealId: deal.id, brand: deal.brand, risk: `정산 요청 ${uploadDays}일 지연`, severity: 'high' });
    }
  }

  for (const inq of inquiries) {
    if (inq.is_read) continue;
    const hours = (now - new Date(inq.created_at).getTime()) / 3_600_000;
    if (hours >= 48) risks.push({ brand: inq.brand_name, risk: `${Math.floor(hours)}시간 미답변`, severity: 'critical' });
  }

  risks.sort((a, b) => ({ critical: 0, high: 1, medium: 2 }[a.severity] - { critical: 0, high: 1, medium: 2 }[b.severity]));

  const explanation = risks.length > 0
    ? `${risks.length}건의 위험 요소 감지. 가장 심각: ${risks[0].brand}의 ${risks[0].risk}.`
    : '현재 위험한 협찬은 없어요.';
  return result(risks, explanation, 92);
}

// ─── Tool: "왜 운영점수가 떨어졌어?" ─────────────────────────────────────────

export type HealthFactor = { name: string; impact: 'positive' | 'negative'; detail: string };

export function explainHealthScore(
  intelligence: CreatorIntelligence,
  prevScore: number | null,
): ToolResult<{ score: number; factors: HealthFactor[] }> {
  const { personal: p, financial: f, relationship: r } = intelligence;
  const score   = intelligence.compositeScore;
  const factors: HealthFactor[] = [];

  if (p.burnoutRisk === 'high')          factors.push({ name: '번아웃 위험', impact: 'negative', detail: '활성 협찬 과부하 + 정체 건수 많음' });
  if (f.monthlyTrend === 'declining')    factors.push({ name: '수익 감소', impact: 'negative', detail: '이번 달 수익이 전월 대비 감소' });
  if (r.dependencyRisk === 'high')       factors.push({ name: '브랜드 집중 위험', impact: 'negative', detail: '특정 브랜드 의존도 60% 초과' });
  if (f.revenueVolatility === 'high')    factors.push({ name: '수익 변동성 높음', impact: 'negative', detail: '월별 수익 편차가 큼' });
  if (p.activityRhythm === 'consistent') factors.push({ name: '일관된 활동', impact: 'positive', detail: '최근 꾸준히 협찬 완료' });
  if (f.settlementReliability >= 80)     factors.push({ name: '정산 신뢰도 높음', impact: 'positive', detail: `정산 완료율 ${f.settlementReliability}%` });
  if (f.monthlyTrend === 'growing')      factors.push({ name: '수익 성장', impact: 'positive', detail: '이번 달 수익이 전월 대비 증가' });

  const prevDiff = prevScore !== null ? score - prevScore : null;
  const negFactors = factors.filter((f) => f.impact === 'negative').map((f) => f.name);
  const explanation = prevDiff !== null
    ? `운영점수 ${score}점${prevDiff >= 0 ? ` (+${prevDiff})` : ` (${prevDiff})`}. ${negFactors.length ? `하락 요인: ${negFactors.join(', ')}.` : ''}`
    : `현재 운영점수 ${score}점. ${negFactors.length ? `주요 리스크: ${negFactors[0]}.` : '전반적으로 안정적이에요.'}`;

  return result({ score, factors }, explanation, 85);
}

// ─── Tool: "다음에 집중해야 할 브랜드는?" ────────────────────────────────────

export function getNextFocusBrand(
  graph: BusinessGraph | null,
  deals: AutomationDeal[],
): ToolResult<{ brand: string; reason: string; suggestedAction: string } | null> {
  if (!graph || graph.nodes.length === 0) {
    return result(null, '브랜드 데이터가 없어요.', 0);
  }

  const activeBrands = new Set(deals.filter((d) => d.status !== 'settled').map((d) => d.brand));
  const candidate = graph.nodes
    .filter((n) => !activeBrands.has(n.brand) && n.status === 'dormant' && n.reliabilityScore > 0.5)
    .sort((a, b) => b.partnershipScore - a.partnershipScore)[0];

  if (!candidate) {
    return result(null, '현재 재협업 추천 브랜드가 없어요.', 50);
  }

  return result(
    {
      brand:           candidate.brand,
      reason:          `파트너십 점수 ${candidate.partnershipScore}점, 신뢰도 ${Math.round(candidate.reliabilityScore * 100)}점의 검증된 파트너.`,
      suggestedAction: '이전 협찬을 언급하며 새 제안서를 보내세요.',
    },
    `${candidate.brand}와의 재협업을 추천해요. ${candidate.totalDeals}번의 이력이 있어요.`,
    78,
  );
}

// ─── Tool: "이번 달 수익 예측" ────────────────────────────────────────────────

export function forecastRevenueTool(
  intelligence: CreatorIntelligence,
): ToolResult<{ projected: number; confidence: number; trend: string }> {
  const { financial: f } = intelligence;
  const trendLabel = f.monthlyTrend === 'growing' ? '성장' : f.monthlyTrend === 'declining' ? '감소' : '안정';
  return result(
    { projected: f.projectedThisMonth, confidence: f.forecastConfidence, trend: f.monthlyTrend },
    `예상 이번 달 수익 ${formatWon(f.projectedThisMonth)} (신뢰도 ${f.forecastConfidence}%). 트렌드: ${trendLabel}.`,
    f.forecastConfidence,
  );
}

// ─── Operational state serialization (for AI context window) ─────────────────

export interface SerializedOperationalState {
  snapshot: {
    criticalRisks: number;
    healthScore: number;
    compositeScore: number;
    burnoutRisk: string;
    trend: string;
  };
  topRisks: string[];
  topPriorities: string[];
  briefingMode: string;
  recentEventSummary: string;
  serializedAt: string;
}

export function serializeOperationalState(
  intelligence: CreatorIntelligence,
  briefing: MorningBriefing | null,
  focusItems: FocusItem[],
  recentEvents: MemoryEntry[],
): SerializedOperationalState {
  return {
    snapshot: {
      criticalRisks:  briefing?.risks.filter((r) => r.severity === 'high').length ?? 0,
      healthScore:    intelligence.compositeScore,
      compositeScore: intelligence.compositeScore,
      burnoutRisk:    intelligence.personal.burnoutRisk,
      trend:          intelligence.trend,
    },
    topRisks:           briefing?.risks.map((r) => r.description) ?? [],
    topPriorities:      focusItems.slice(0, 3).map((i) => i.title),
    briefingMode:       briefing?.mode ?? 'stable',
    recentEventSummary: summarizeRecentEvents(recentEvents),
    serializedAt:       new Date().toISOString(),
  };
}

// ─── Event summarization ──────────────────────────────────────────────────────

export function summarizeRecentEvents(entries: MemoryEntry[]): string {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
  const parts = [...counts.entries()].map(([type, count]) => {
    const label =
      type === 'recommendation_actioned'  ? '추천 실행' :
      type === 'recommendation_dismissed' ? '추천 무시' :
      type === 'deal_status_changed'      ? '상태 변경' :
      type === 'automation_fired'         ? '자동화 실행' : type;
    return `${label} ${count}건`;
  });
  return parts.length > 0 ? parts.join(', ') : '이벤트 없음';
}
