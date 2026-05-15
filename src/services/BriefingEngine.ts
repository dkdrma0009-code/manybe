// Pure computation — no async. Generates structured briefings from operational data.

import { MorningBriefing, WeeklyReview, BriefingMode, BriefingItem, BriefingRisk } from '../types/autonomous';
import { AutomationDeal, AutomationInquiry } from './AutomationEngine';

interface RevenueEntry {
  amount: number;
  date: string; // YYYY-MM-DD
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWon(n: number): string {
  if (n >= 100_000_000) return `${Math.floor(n / 100_000_000)}억원`;
  if (n >= 10_000)      return `${Math.floor(n / 10_000)}만원`;
  return n.toLocaleString('ko-KR') + '원';
}

function determineBriefingMode(criticalRiskCount: number, revGrowthPct: number): BriefingMode {
  if (criticalRiskCount >= 2) return 'critical';
  if (revGrowthPct > 10)      return 'growth';
  return 'stable';
}

// ─── Morning briefing ─────────────────────────────────────────────────────────

export function generateMorningBriefing(
  deals: AutomationDeal[],
  inquiries: AutomationInquiry[],
  thisMonthRevenue: number,
  prevMonthRevenue: number,
): MorningBriefing {
  const now         = Date.now();
  const today       = new Date().toISOString().split('T')[0];
  const activeDeals = deals.filter((d) => d.status !== 'settled');

  // ── Risks ──────────────────────────────────────────────────────────────────
  const risks: BriefingRisk[] = [];

  const staleDeals = activeDeals.filter((d) => {
    const lastActive = d.updated_at ?? d.created_at;
    return Math.floor((now - new Date(lastActive).getTime()) / 86_400_000) >= 7;
  });
  if (staleDeals.length > 0) {
    risks.push({
      type: 'stale_deals',
      description: `${staleDeals.length}건의 협찬이 7일 이상 정체 상태예요.`,
      severity: staleDeals.length >= 3 ? 'high' : 'medium',
    });
  }

  const unreadInqs = inquiries.filter((i) => !i.is_read);
  if (unreadInqs.length > 0) {
    const oldestHours = unreadInqs.reduce((max, i) => {
      const h = (now - new Date(i.created_at).getTime()) / 3_600_000;
      return h > max ? h : max;
    }, 0);
    risks.push({
      type: 'unread_inquiries',
      description: `미답변 문의 ${unreadInqs.length}건 (최장 ${Math.floor(oldestHours)}시간 경과).`,
      severity: oldestHours > 48 ? 'high' : 'medium',
    });
  }

  const todayDeadlines = activeDeals.filter((d) => d.end_date === today);
  if (todayDeadlines.length > 0) {
    risks.push({
      type: 'today_deadlines',
      description: `오늘 마감인 협찬이 ${todayDeadlines.length}건 있어요.`,
      severity: 'high',
    });
  }

  const overdueDeals = activeDeals.filter((d) => d.end_date && d.end_date < today);
  if (overdueDeals.length > 0) {
    risks.push({
      type: 'overdue_deals',
      description: `마감일이 지난 협찬 ${overdueDeals.length}건이 아직 진행 중이에요.`,
      severity: 'high',
    });
  }

  // ── Priorities ─────────────────────────────────────────────────────────────
  const priorities: BriefingItem[] = [];

  if (todayDeadlines.length > 0) {
    priorities.push({ priority: 1, text: `오늘 마감 협찬 ${todayDeadlines.length}건 처리`, navigateTo: 'deals', urgency: 'critical' });
  }
  if (overdueDeals.length > 0) {
    priorities.push({ priority: priorities.length + 1, text: `마감 초과 협찬 ${overdueDeals.length}건 상태 업데이트`, navigateTo: 'deals', urgency: 'critical' });
  }
  if (unreadInqs.length > 0) {
    priorities.push({ priority: priorities.length + 1, text: `미답변 문의 ${unreadInqs.length}건 확인`, navigateTo: 'inquiries', urgency: unreadInqs.length > 2 ? 'critical' : 'normal' });
  }

  const uploadedPending = activeDeals.filter((d) => d.status === 'uploaded');
  if (uploadedPending.length > 0) {
    const total = uploadedPending.reduce((s, d) => s + d.amount, 0);
    priorities.push({
      priority: priorities.length + 1,
      text: `정산 대기 ${uploadedPending.length}건 (${formatWon(total)})`,
      navigateTo: 'revenue',
      urgency: 'normal',
    });
  }

  if (staleDeals.length > 0) {
    priorities.push({ priority: priorities.length + 1, text: `장기 정체 협찬 ${staleDeals.length}건 확인`, navigateTo: 'deals', urgency: 'normal' });
  }

  // ── Revenue insight ────────────────────────────────────────────────────────
  const revGrowthPct = prevMonthRevenue > 0
    ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
    : 0;
  const revenueInsight = prevMonthRevenue === 0
    ? `이번 달 누적 수익 ${formatWon(thisMonthRevenue)}`
    : revGrowthPct >= 0
      ? `이번 달 수익 ${formatWon(thisMonthRevenue)} (전월 대비 +${revGrowthPct.toFixed(0)}%)`
      : `이번 달 수익 ${formatWon(thisMonthRevenue)} (전월 대비 ${revGrowthPct.toFixed(0)}%)`;

  // ── Mode + headline ────────────────────────────────────────────────────────
  const criticalCount = risks.filter((r) => r.severity === 'high').length;
  const mode    = determineBriefingMode(criticalCount, revGrowthPct);
  const headline =
    mode === 'critical' ? '즉시 처리가 필요한 항목이 있어요' :
    mode === 'growth'   ? '좋은 흐름이에요. 이 모멘텀을 유지하세요' :
                          '운영이 안정적으로 진행 중이에요';
  const subheadline = priorities.length > 0
    ? `오늘 집중할 ${Math.min(priorities.length, 3)}가지`
    : '오늘은 특별한 액션이 필요 없어요';

  // ── Brand alert ────────────────────────────────────────────────────────────
  const brandAmounts = activeDeals.reduce<Record<string, number>>(
    (acc, d) => { acc[d.brand] = (acc[d.brand] ?? 0) + d.amount; return acc; }, {},
  );
  const topEntry  = Object.entries(brandAmounts).sort((a, b) => b[1] - a[1])[0];
  const brandAlert = topEntry && topEntry[1] > 0
    ? `${topEntry[0]}과의 협찬이 현재 파이프라인 최대 금액이에요 (${formatWon(topEntry[1])})`
    : undefined;

  return {
    date: today,
    mode,
    headline,
    subheadline,
    priorities: priorities.slice(0, 4),
    risks,
    revenueInsight,
    brandAlert,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Weekly review ────────────────────────────────────────────────────────────

export function generateWeeklyReview(
  deals: AutomationDeal[],
  weekRevenues: RevenueEntry[],
  prevWeekRevenues: RevenueEntry[],
): WeeklyReview {
  const now       = Date.now();
  const weekStart = new Date(now - 7 * 86_400_000).toISOString().split('T')[0];

  // Top brand by revenue this week (approximated from deal amounts in active state)
  const settledThisWeek = deals.filter((d) => {
    if (d.status !== 'settled') return false;
    const t = new Date(d.updated_at ?? d.created_at).getTime();
    return t > now - 7 * 86_400_000;
  });
  const brandRevMap = settledThisWeek.reduce<Record<string, number>>(
    (acc, d) => { acc[d.brand] = (acc[d.brand] ?? 0) + d.amount; return acc; }, {},
  );
  const topEntry     = Object.entries(brandRevMap).sort((a, b) => b[1] - a[1])[0];
  const topBrand     = topEntry?.[0] ?? '없음';
  const topBrandRevenue = topEntry?.[1] ?? 0;

  // Overdue count
  const overdueCount = deals.filter((d) => {
    if (d.status === 'settled') return false;
    const lastActive = d.updated_at ?? d.created_at;
    return Math.floor((now - new Date(lastActive).getTime()) / 86_400_000) >= 7;
  }).length;

  // Completion rate this week
  const totalActive  = deals.filter((d) => d.status !== 'settled').length;
  const completionRate = (totalActive + settledThisWeek.length) > 0
    ? Math.round((settledThisWeek.length / (totalActive + settledThisWeek.length)) * 100) : 0;

  // Burnout: heavy active load + stale deals
  const activeCount = deals.filter((d) => d.status !== 'settled').length;
  const burnoutRisk  = activeCount >= 5 && overdueCount >= 2;

  // Revenue comparison
  const thisWeekTotal = weekRevenues.reduce((s, r) => s + r.amount, 0);
  const prevWeekTotal = prevWeekRevenues.reduce((s, r) => s + r.amount, 0);
  const revStr = prevWeekTotal > 0
    ? `전주 대비 ${thisWeekTotal >= prevWeekTotal ? '+' : ''}${Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100)}%`
    : `${formatWon(thisWeekTotal)}`;

  const aiSummary = [
    topBrandRevenue > 0 && `${topBrand}이 이번 주 최고 수익 브랜드예요 (${formatWon(topBrandRevenue)}).`,
    overdueCount > 0 && `${overdueCount}건의 협찬이 정체 상태예요.`,
    burnoutRisk && '활성 협찬이 많아 번아웃 위험이 있어요.',
    settledThisWeek.length > 0 && `이번 주 ${settledThisWeek.length}건 완료. 수익 변화 ${revStr}.`,
  ].filter(Boolean).join(' ') || '이번 주 운영 데이터를 분석 중이에요.';

  const actionableInsight = overdueCount > 0
    ? `정체 협찬 ${overdueCount}건 중 가장 오래된 것부터 처리하세요.`
    : activeCount > 3
    ? '현재 파이프라인이 충분해요. 품질에 집중하세요.'
    : '새 브랜드 아웃리치를 시작하기 좋은 시점이에요.';

  return {
    weekStart,
    topBrand,
    topBrandRevenue,
    overdueCount,
    completionRate,
    burnoutRisk,
    aiSummary,
    actionableInsight,
  };
}
