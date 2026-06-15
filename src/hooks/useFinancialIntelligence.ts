import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { computeExtendedForecast, ExtendedForecast, MonthlyRevenue, DealForForecast } from '../services/FinancialForecastEngine';
import { computeSettlementReliability, SettlementReliabilityReport, SettledDeal, PendingDeal } from '../services/SettlementReliabilityEngine';
import { computeCashFlow, CashFlowReport, PendingDealCF } from '../services/CashFlowEngine';
import { computeStabilityReport, StabilityReport, BrandRevenue } from '../services/RevenueStabilityEngine';
import { computeTaxSummary, TaxSummary, DealForTax } from '../services/TaxFeeEngine';

export interface FinancialIntelligence {
  forecast: ExtendedForecast;
  settlement: SettlementReliabilityReport;
  cashFlow: CashFlowReport;
  stability: StabilityReport;
  tax: TaxSummary;
}

const EMPTY_FORECAST: ExtendedForecast = {
  nextMonth: { low: 0, mid: 0, high: 0 },
  twoMonthsOut: 0, threeMonthsOut: 0,
  trendMoM: 0, seasonalFactor: 1, pipelineBoost: 0,
  reliabilityAdjusted: 0, forecastConfidence: 10, dataMonths: 0,
};
const EMPTY_SETTLEMENT: SettlementReliabilityReport = {
  overallScore: 80, avgSettlementDays: 0, overdueExposure: 0,
  overdueDeals: [], brandBreakdown: [], delayProbability: 0.2,
};
const EMPTY_CASHFLOW: CashFlowReport = {
  thisMonthExpected: 0, nextMonthExpected: 0, twoMonthsExpected: 0,
  payoutSchedule: [], predictabilityScore: 50, pendingTotal: 0, highConfidenceTotal: 0,
};
const EMPTY_STABILITY: StabilityReport = {
  hhiScore: 10000, diversificationScore: 0, recurringRatio: 0, volatilityScore: 0,
  stabilityGrade: 'C', topBrandShare: 100, brandCount: 0, recurringBrandCount: 0,
};
const EMPTY_TAX: TaxSummary = {
  totalGross: 0, totalWithholding: 0, totalPlatformFees: 0, totalNet: 0,
  effectiveTaxRate: 0.033, recommendedReserve: 0, lineItems: [], annualTaxEstimate: 0,
};

const EMPTY: FinancialIntelligence = {
  forecast: EMPTY_FORECAST,
  settlement: EMPTY_SETTLEMENT,
  cashFlow: EMPTY_CASHFLOW,
  stability: EMPTY_STABILITY,
  tax: EMPTY_TAX,
};

export function useFinancialIntelligence(userId: string | undefined) {
  const [data, setData] = useState<FinancialIntelligence>(EMPTY);
  const [loading, setLoading] = useState(!!userId);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
        .toISOString().slice(0, 10);
      const todayISO = now.toISOString().slice(0, 10);

      const [revenueRes, dealRes] = await Promise.all([
        supabase
          .from('revenues')
          .select('amount, date')
          .eq('user_id', userId)
          .gte('date', twelveMonthsAgo),
        supabase
          .from('deals')
          .select('id, brand, title, amount, status, end_date, created_at')
          .eq('user_id', userId),
      ]);

      if (revenueRes.error || dealRes.error) throw revenueRes.error ?? dealRes.error;

      // Aggregate revenues by month
      const monthMap = new Map<string, number>();
      for (const r of revenueRes.data ?? []) {
        const key = r.date.slice(0, 7);
        monthMap.set(key, (monthMap.get(key) ?? 0) + r.amount);
      }
      const monthlyRevenues: MonthlyRevenue[] = [...monthMap.entries()].map(
        ([yearMonth, amount]) => ({ yearMonth, amount }),
      );

      // nullable 컬럼을 읽기 경계에서 한 번 정규화 (amount/brand/created_at)
      const deals = (dealRes.data ?? []).map((d) => ({
        id: d.id,
        status: d.status,
        end_date: d.end_date,
        amount: d.amount ?? 0,
        brand: d.brand ?? '',
        created_at: d.created_at ?? new Date().toISOString(),
      }));

      // ── Forecast ──
      const dealsForForecast: DealForForecast[] = deals.map((d) => ({
        id: d.id, status: d.status, end_date: d.end_date, amount: d.amount, created_at: d.created_at,
      }));
      const settlementScore = data.settlement.overallScore; // use previous cycle value
      const forecast = computeExtendedForecast(monthlyRevenues, dealsForForecast, settlementScore);

      // ── Settlement Reliability ──
      const settledDeals: SettledDeal[] = deals
        .filter((d) => d.status === 'settled' && d.end_date)
        .map((d) => ({
          id: d.id, brand: d.brand, amount: d.amount,
          upload_date: d.created_at.slice(0, 10),
          settled_date: d.end_date!,
        }));
      const pendingForSettlement: PendingDeal[] = deals
        .filter((d) => d.status !== 'settled')
        .map((d) => ({
          id: d.id, brand: d.brand, amount: d.amount, status: d.status,
          upload_date: d.created_at.slice(0, 10),
        }));
      const settlement = computeSettlementReliability(settledDeals, pendingForSettlement, todayISO);

      // Re-run forecast with fresh settlement score
      const forecastFinal = computeExtendedForecast(monthlyRevenues, dealsForForecast, settlement.overallScore);

      // ── Cash Flow ──
      const pendingForCF: PendingDealCF[] = deals
        .filter((d) => d.status !== 'settled')
        .map((d) => ({
          id: d.id, brand: d.brand, amount: d.amount, status: d.status,
          upload_date: d.created_at.slice(0, 10),
          end_date: d.end_date,
        }));
      const cashFlow = computeCashFlow(pendingForCF, todayISO);

      // ── Stability ──
      const brandTotals = new Map<string, { amount: number; count: number }>();
      const brandMonthMap = new Map<string, Set<string>>();
      for (const d of deals.filter((x) => x.status === 'settled')) {
        const entry = brandTotals.get(d.brand) ?? { amount: 0, count: 0 };
        entry.amount += d.amount; entry.count += 1;
        brandTotals.set(d.brand, entry);

        if (d.end_date) {
          const m = d.end_date.slice(0, 7);
          const months = brandMonthMap.get(d.brand) ?? new Set<string>();
          months.add(m);
          brandMonthMap.set(d.brand, months);
        }
      }
      const brandRevenues: BrandRevenue[] = [...brandTotals.entries()].map(
        ([brand, v]) => ({ brand, totalAmount: v.amount, dealCount: v.count }),
      );
      const stability = computeStabilityReport(brandRevenues, monthlyRevenues, brandMonthMap);

      // ── Tax ──
      const completedMonths = monthlyRevenues.length;
      const dealsForTax: DealForTax[] = deals.map((d) => ({ id: d.id, amount: d.amount, status: d.status }));
      const tax = computeTaxSummary(dealsForTax, completedMonths);

      setData({ forecast: forecastFinal, settlement, cashFlow, stability, tax });
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
}
