import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import {
  forecastRevenue,
  detectRisks,
  detectOpportunities,
  DealForPrediction,
  RevenueForPrediction,
  RevenueForecast,
  RiskSignal,
  Opportunity,
} from '../services/PredictiveEngine';

export interface DailyDigestItem {
  icon: string;
  text: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  actionLabel?: string;
  navigateTo?: string;
}

export interface OperationalSnapshot {
  activeDeals: number;
  overdueDeals: number;
  pendingSettlement: number;
  unreadInquiries: number;
  forecast: RevenueForecast | null;
  risks: RiskSignal[];
  opportunities: Opportunity[];
  digest: DailyDigestItem[];
  healthScore: number;
  summaryText: string;
}

function computeHealthScore(
  overdue: number,
  maxSettlementDelay: number,
  active: number,
  unread: number,
): number {
  let s = 100;
  s -= overdue * 15;
  s -= Math.min(maxSettlementDelay / 10, 20);
  if (active > 7) s -= (active - 7) * 5;
  s -= unread * 5;
  return Math.max(0, Math.min(100, Math.round(s)));
}

function buildDigest(
  overdueCount: number,
  todayCount: number,
  settlementDelayed: number,
  unread: number,
  hasScheduleOverload: boolean,
): DailyDigestItem[] {
  const items: DailyDigestItem[] = [];
  if (overdueCount > 0)
    items.push({ icon: '🔴', text: `마감 초과 ${overdueCount}건 처리 필요`, severity: 'critical', actionLabel: '확인하기', navigateTo: 'deals' });
  if (todayCount > 0)
    items.push({ icon: '⏰', text: `오늘 마감 ${todayCount}건`, severity: 'critical', actionLabel: '협찬 보기', navigateTo: 'deals' });
  if (settlementDelayed > 0)
    items.push({ icon: '💳', text: `정산 지연 ${settlementDelayed}건`, severity: 'warning', actionLabel: '수익 기록', navigateTo: 'revenue' });
  if (unread > 0)
    items.push({ icon: '📬', text: `미답변 문의 ${unread}건`, severity: 'warning', actionLabel: '문의 확인', navigateTo: 'inquiries' });
  if (hasScheduleOverload)
    items.push({ icon: '📅', text: '이번 주 마감 일정이 집중돼 있어요', severity: 'warning', actionLabel: '캘린더 보기', navigateTo: 'calendar' });
  if (items.length === 0)
    items.push({ icon: '✅', text: '오늘 긴급 처리 항목이 없어요', severity: 'success' });
  return items;
}

export function useOperationalContext(userId: string | undefined) {
  const [snapshot, setSnapshot] = useState<OperationalSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const build = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      .toISOString().split('T')[0];

    const [dealsRes, revenuesRes, inquiriesRes] = await Promise.all([
      supabase
        .from('deals')
        .select('id, brand, title, status, end_date, amount, created_at, updated_at')
        .eq('user_id', userId),
      supabase
        .from('revenues')
        .select('amount, date')
        .eq('user_id', userId)
        .gte('date', twoMonthsAgo),
      supabase
        .from('media_kit_inquiries')
        .select('id, media_kits!inner(user_id)')
        .eq('media_kits.user_id', userId)
        .eq('is_read', false),
    ]);

    const deals    = (dealsRes.data ?? []) as DealForPrediction[];
    const revenues = (revenuesRes.data ?? []) as RevenueForPrediction[];
    const active   = deals.filter((d) => d.status !== 'settled');
    const overdue  = active.filter((d) => d.end_date && d.end_date < todayStr);
    const today    = active.filter((d) => d.end_date === todayStr);
    const uploaded = active.filter((d) => d.status === 'uploaded');

    const settlementDelayed = uploaded.filter((d) =>
      Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86_400_000) >= 14
    ).length;

    const maxDelay = uploaded.reduce((mx, d) =>
      Math.max(mx, Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86_400_000)), 0);

    const forecast     = forecastRevenue(deals, revenues);
    const risks        = detectRisks(deals);
    const opportunities = detectOpportunities(deals);
    const unread       = inquiriesRes.data?.length ?? 0;
    const healthScore  = computeHealthScore(overdue.length, maxDelay, active.length, unread);
    const digest       = buildDigest(
      overdue.length, today.length, settlementDelayed, unread,
      risks.some((r) => r.type === 'schedule_overload'),
    );

    const urgentCount = overdue.length + today.length + settlementDelayed + unread;
    const summaryText = urgentCount > 0
      ? [
          overdue.length > 0 && `마감 초과 ${overdue.length}건`,
          settlementDelayed > 0 && `정산 지연 ${settlementDelayed}건`,
          unread > 0 && `미답변 ${unread}건`,
        ].filter(Boolean).join(' · ')
      : '현재 운영 상태 양호';

    setSnapshot({
      activeDeals: active.length,
      overdueDeals: overdue.length,
      pendingSettlement: settlementDelayed,
      unreadInquiries: unread,
      forecast,
      risks,
      opportunities,
      digest,
      healthScore,
      summaryText,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => { build(); }, [build]);

  return { snapshot, loading, refetch: build };
}
