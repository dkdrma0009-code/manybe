import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { Revenue, Deal } from '../types';
import { STAGE_CONFIG } from '../constants/dealStatus';

export interface CategoryStat {
  label: string;
  amount: number;
  icon: string;
  cardBg: string;
  iconBg: string;
  textColor: string;
}

export interface HomeDeal {
  id: string;
  brand: string;
  amount: number;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  initial: string;
  initBg: string;
}


export interface ActionItem {
  id: string;
  type: 'new_inquiry' | 'inquiry_pipeline' | 'deal_deadline_today' | 'deal_deadline_week' | 'schedule_today' | 'unsettled' | 'overdue';
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  bg: string;
  urgent: boolean;
}

export interface HomeData {
  totalRevenue: number;
  prevMonthRevenue: number;
  categoryStats: CategoryStat[];
  activeDeals: HomeDeal[];
  dealCount: number;
  pendingSettlement: number;
  estimatedTax: number;
  barData: number[];
  actionItems: ActionItem[];
  newInquiryCount: number;
}

const CATEGORY_CONFIG: Record<string, Omit<CategoryStat, 'amount'>> = {
  platform:    { label: '플랫폼 광고', icon: '📱', cardBg: '#FFF1F0', iconBg: '#FECACA', textColor: '#DC2626' },
  sponsorship: { label: '브랜드 협찬', icon: '🤝', cardBg: '#EAE3FF', iconBg: '#C4B0F8', textColor: '#6E56F0' },
  affiliate:   { label: '제휴 수익',   icon: '🔗', cardBg: '#FFF7ED', iconBg: '#FED7AA', textColor: '#EA580C' },
  other:       { label: '기타',        icon: '💡', cardBg: '#F3F4F6', iconBg: '#E5E7EB', textColor: '#4B5563' },
};

const DEAL_STATUS_CONFIG: Record<Deal['status'], { label: string; color: string; bg: string }> = {
  inquiry:     { label: '문의',     ...STAGE_CONFIG.inquiry },
  reviewing:   { label: '검토중',   ...STAGE_CONFIG.reviewing },
  in_progress: { label: '진행중',   ...STAGE_CONFIG.in_progress },
  uploaded:    { label: '업로드됨', ...STAGE_CONFIG.uploaded },
  settled:     { label: '정산완료', ...STAGE_CONFIG.settled },
};

const AVATAR_COLORS = ['#1A1A2E', '#6E56F0', '#2E8C5D', '#3B6FD9', '#EA580C', '#C13C3C'];

function avatarColor(brand: string) {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const DEFAULT_DATA: HomeData = {
  totalRevenue: 0,
  prevMonthRevenue: 0,
  categoryStats: Object.values(CATEGORY_CONFIG).map((c) => ({ ...c, amount: 0 })),
  activeDeals: [],
  dealCount: 0,
  pendingSettlement: 0,
  estimatedTax: 0,
  barData: [0, 0, 0, 0, 0, 0, 0],
  actionItems: [],
  newInquiryCount: 0,
};

// PLAN_GATE: creator business analytics — avg views per video, upload frequency, sponsorship activity,
//   collaboration frequency, response speed, workflow performance metrics
export function useHomeData(userId: string | undefined) {
  const [data, setData] = useState<HomeData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      // Last 7 days for bar chart
      const day7Start = new Date(now);
      day7Start.setDate(now.getDate() - 6);
      const day7StartStr = day7Start.toISOString().split('T')[0];

      const todayStr = now.toISOString().split('T')[0];
      const weekLater = new Date(now);
      weekLater.setDate(now.getDate() + 7);
      const weekLaterStr = weekLater.toISOString().split('T')[0];
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const [revenueRes, prevRevenueRes, dealsRes, barRes, deadlineRes, scheduleRes, inquiryRes, overdueRes] = await Promise.all([
        supabase
          .from('revenues')
          .select('amount, category')
          .eq('user_id', userId)
          .gte('date', monthStart)
          .lte('date', monthEnd),
        supabase
          .from('revenues')
          .select('amount')
          .eq('user_id', userId)
          .gte('date', prevMonthStart)
          .lte('date', prevMonthEnd),
        supabase
          .from('deals')
          .select('id, brand, amount, status')
          .eq('user_id', userId)
          .in('status', ['inquiry', 'reviewing', 'in_progress', 'uploaded']),
        supabase
          .from('revenues')
          .select('amount, date')
          .eq('user_id', userId)
          .gte('date', day7StartStr)
          .lte('date', now.toISOString().split('T')[0]),
        supabase
          .from('deals')
          .select('id, brand, title, end_date, amount, status')
          .eq('user_id', userId)
          .in('status', ['inquiry', 'reviewing', 'in_progress', 'uploaded'])
          .gte('end_date', todayStr)
          .lte('end_date', weekLaterStr)
          .order('end_date', { ascending: true }),
        supabase
          .from('schedules')
          .select('id, title, type, start_time')
          .eq('user_id', userId)
          .gte('start_time', todayStart)
          .lte('start_time', todayEnd)
          .order('start_time', { ascending: true }),
        supabase
          .from('media_kit_inquiries')
          .select('id, media_kits!inner(user_id)', { count: 'exact', head: true })
          .eq('media_kits.user_id', userId)
          .eq('is_read', false),
        supabase
          .from('deals')
          .select('id, brand, title, end_date, status')
          .eq('user_id', userId)
          .in('status', ['inquiry', 'reviewing', 'in_progress', 'uploaded'])
          .lt('end_date', todayStr)
          .order('end_date', { ascending: true }),
      ]);

      if (revenueRes.error) throw revenueRes.error;
      if (prevRevenueRes.error) throw prevRevenueRes.error;
      if (dealsRes.error) throw dealsRes.error;
      if (barRes.error) throw barRes.error;
      if (deadlineRes.error) throw deadlineRes.error;
      if (scheduleRes.error) throw scheduleRes.error;
      const newInquiryCount = inquiryRes.count ?? 0;
      const overdueDeals = overdueRes.data ?? [];

      // Total and category breakdown
      const revenues: Pick<Revenue, 'amount' | 'category'>[] = revenueRes.data ?? [];
      const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);

      const categoryTotals: Record<string, number> = {};
      for (const r of revenues) {
        const key = r.category in CATEGORY_CONFIG ? r.category : 'other';
        categoryTotals[key] = (categoryTotals[key] ?? 0) + r.amount;
      }
      const categoryStats: CategoryStat[] = Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => ({
        ...cfg,
        amount: categoryTotals[key] ?? 0,
      }));

      // Previous month total (for % change badge)
      const prevMonthRevenue = (prevRevenueRes.data ?? []).reduce((sum, r) => sum + r.amount, 0);

      // Active deals — nullable 컬럼 정규화
      const deals: Pick<Deal, 'id' | 'brand' | 'amount' | 'status'>[] = (dealsRes.data ?? []).map((d) => ({
        id: d.id, brand: d.brand ?? '', amount: d.amount ?? 0, status: d.status as Deal['status'],
      }));
      const activeDeals: HomeDeal[] = deals.map((d) => {
        const cfg = DEAL_STATUS_CONFIG[d.status];
        return {
          id: d.id,
          brand: d.brand,
          amount: d.amount,
          statusLabel: cfg.label,
          statusColor: cfg.color,
          statusBg: cfg.bg,
          initial: d.brand.charAt(0),
          initBg: avatarColor(d.brand),
        };
      });

      const dealCount = deals.length;
      const pendingSettlement = deals
        .filter((d) => d.status === 'uploaded')
        .reduce((sum, d) => sum + d.amount, 0);
      const inquiryPipelineCount = deals.filter((d) => d.status === 'inquiry').length;
      const estimatedTax = Math.round(totalRevenue * 0.033);

      // Bar chart: sum revenue per day for last 7 days
      const dayTotals: Record<string, number> = {};
      for (const r of barRes.data ?? []) {
        const day = r.date.slice(0, 10);
        dayTotals[day] = (dayTotals[day] ?? 0) + r.amount;
      }
      const barData: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().split('T')[0];
        barData.push(dayTotals[key] ?? 0);
      }

      // Build action items
      const actionItems: ActionItem[] = [];

      if (newInquiryCount > 0) {
        actionItems.push({
          id: 'new_inquiry',
          type: 'new_inquiry',
          title: `새 협찬 문의 ${newInquiryCount}건`,
          subtitle: '브랜드에서 협찬 제안이 도착했어요',
          icon: '📬',
          color: '#6E56F0',
          bg: '#EAE3FF',
          urgent: true,
        });
      }

      if (inquiryPipelineCount > 0) {
        actionItems.push({
          id: 'inquiry_pipeline',
          type: 'inquiry_pipeline',
          title: `답변 대기 협찬 ${inquiryPipelineCount}건`,
          subtitle: '검토 단계로 이동하거나 거절하세요',
          icon: '💬',
          color: '#6E56F0',
          bg: '#EAE3FF',
          urgent: false,
        });
      }

      for (const d of deadlineRes.data ?? []) {
        const endDate = d.end_date?.slice(0, 10) ?? '';
        const isToday = endDate === todayStr;
        const daysLeft = Math.ceil((new Date(endDate).getTime() - new Date(todayStr).getTime()) / 86400000);
        actionItems.push({
          id: d.id,
          type: isToday ? 'deal_deadline_today' : 'deal_deadline_week',
          title: `${d.brand} 마감 ${isToday ? 'D-0' : `D-${daysLeft}`}`,
          subtitle: `${d.title}`,
          icon: isToday ? '🔔' : '⏰',
          color: isToday ? '#C13C3C' : '#C68318',
          bg: isToday ? '#FBE5E5' : '#FBF1DC',
          urgent: isToday,
        });
      }

      const TYPE_ICON: Record<string, string> = { content: '📤', deadline: '🔔', meeting: '📋', other: '💡' };
      for (const s of scheduleRes.data ?? []) {
        if (!s.start_time) continue;
        const t = new Date(s.start_time);
        const timeStr = `${t.getHours() >= 12 ? '오후' : '오전'} ${t.getHours() > 12 ? t.getHours() - 12 : t.getHours()}시`;
        actionItems.push({
          id: s.id,
          type: 'schedule_today',
          title: s.title,
          subtitle: `오늘 ${timeStr}`,
          icon: TYPE_ICON[s.type] ?? '📌',
          color: '#3B6FD9',
          bg: '#E3ECFB',
          urgent: false,
        });
      }

      for (const d of overdueDeals) {
        if (!d.end_date) continue;
        const daysOver = Math.floor(
          (new Date(todayStr).getTime() - new Date(d.end_date.slice(0, 10)).getTime()) / 86400000
        );
        actionItems.push({
          id: `overdue_${d.id}`,
          type: 'overdue',
          title: `${d.brand} 마감 D+${daysOver}`,
          subtitle: `${d.title} · 마감일이 지났어요`,
          icon: '🔴',
          color: '#C13C3C',
          bg: '#FBE5E5',
          urgent: true,
        });
      }

      if (pendingSettlement > 0) {
        actionItems.push({
          id: 'unsettled',
          type: 'unsettled',
          title: `정산 대기 ${pendingSettlement.toLocaleString('ko-KR')}원`,
          subtitle: '업로드 완료 후 미정산 협찬',
          icon: '💳',
          color: '#2E8C5D',
          bg: '#DEEFE5',
          urgent: false,
        });
      }

      setData({
        totalRevenue,
        prevMonthRevenue,
        categoryStats,
        activeDeals,
        dealCount,
        pendingSettlement,
        estimatedTax,
        barData,
        actionItems,
        newInquiryCount,
      });
    } catch (e: any) {
      setError(e.message ?? '데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
