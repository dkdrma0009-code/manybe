import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { Revenue, Deal } from '../types';

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
  type: 'deal_deadline_today' | 'deal_deadline_week' | 'schedule_today' | 'unsettled';
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
}

const CATEGORY_CONFIG: Record<string, Omit<CategoryStat, 'amount'>> = {
  platform:    { label: '플랫폼 광고', icon: '📱', cardBg: '#FFF1F0', iconBg: '#FECACA', textColor: '#DC2626' },
  sponsorship: { label: '브랜드 협찬', icon: '🤝', cardBg: '#F5F3FF', iconBg: '#DDD6FE', textColor: '#7C3AED' },
  affiliate:   { label: '제휴 수익',   icon: '🔗', cardBg: '#FFF7ED', iconBg: '#FED7AA', textColor: '#EA580C' },
  other:       { label: '기타',        icon: '💡', cardBg: '#F3F4F6', iconBg: '#E5E7EB', textColor: '#4B5563' },
};

const DEAL_STATUS_CONFIG: Record<Deal['status'], { label: string; color: string; bg: string }> = {
  pending:    { label: '검토중',   color: '#F59E0B', bg: '#FEF3C7' },
  in_progress:{ label: '협상중',   color: '#7C3AED', bg: '#F5F3FF' },
  completed:  { label: '계약완료', color: '#059669', bg: '#D1FAE5' },
  cancelled:  { label: '취소됨',   color: '#9CA3AF', bg: '#F3F4F6' },
};

const AVATAR_COLORS = ['#1A1A2E', '#6C63FF', '#059669', '#2563EB', '#EA580C', '#DC2626'];

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
};

// DEV_BYPASS_AUTH 모드에서 보여줄 샘플 데이터
const DEV_DATA: HomeData = {
  totalRevenue: 4320000,
  prevMonthRevenue: 3857143,
  categoryStats: [
    { ...CATEGORY_CONFIG.platform,    amount: 1800000 },
    { ...CATEGORY_CONFIG.sponsorship, amount: 2000000 },
    { ...CATEGORY_CONFIG.affiliate,   amount: 320000 },
    { ...CATEGORY_CONFIG.other,       amount: 200000 },
  ],
  activeDeals: [
    { id: '1', brand: '나이키',   amount: 3000000, statusLabel: '협상중',   statusColor: '#7C3AED', statusBg: '#F5F3FF', initial: '나', initBg: '#1A1A2E' },
    { id: '2', brand: '올리브영', amount: 1500000, statusLabel: '계약완료', statusColor: '#059669', statusBg: '#D1FAE5', initial: '올', initBg: '#6C63FF' },
  ],
  dealCount: 5,
  pendingSettlement: 1200000,
  estimatedTax: 142560,
  barData: [2400000, 3200000, 1800000, 3600000, 2800000, 3400000, 4320000],
  actionItems: [
    { id: 'a1', type: 'deal_deadline_today', title: '나이키 협찬 마감 D-0', subtitle: '러닝화 협찬 콘텐츠 · 오늘까지', icon: '🔔', color: '#DC2626', bg: '#FEE2E2', urgent: true },
    { id: 'a2', type: 'deal_deadline_week',  title: '삼성전자 협찬 마감 D-3', subtitle: '갤럭시 언박싱 · 6월 1일', icon: '⏰', color: '#D97706', bg: '#FEF3C7', urgent: false },
    { id: 'a3', type: 'unsettled',            title: '정산 대기 150만원', subtitle: '올리브영 협찬 완료 후 미정산', icon: '💳', color: '#059669', bg: '#D1FAE5', urgent: false },
  ],
};

export function useHomeData(userId: string | undefined) {
  const [data, setData] = useState<HomeData>(__DEV__ ? DEV_DATA : DEFAULT_DATA);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setData(DEV_DATA);
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
      const tomorrowStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().split('T')[0];
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const [revenueRes, prevRevenueRes, dealsRes, barRes, deadlineRes, scheduleRes] = await Promise.all([
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
          .in('status', ['pending', 'in_progress']),
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
          .in('status', ['pending', 'in_progress'])
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
      ]);

      if (revenueRes.error) throw revenueRes.error;
      if (prevRevenueRes.error) throw prevRevenueRes.error;
      if (dealsRes.error) throw dealsRes.error;
      if (barRes.error) throw barRes.error;
      if (deadlineRes.error) throw deadlineRes.error;
      if (scheduleRes.error) throw scheduleRes.error;

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

      // Active deals
      const deals: Pick<Deal, 'id' | 'brand' | 'amount' | 'status'>[] = dealsRes.data ?? [];
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
        .filter((d) => d.status === 'in_progress')
        .reduce((sum, d) => sum + d.amount, 0);
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
          color: isToday ? '#DC2626' : '#D97706',
          bg: isToday ? '#FEE2E2' : '#FEF3C7',
          urgent: isToday,
        });
      }

      const TYPE_ICON: Record<string, string> = { content: '📤', deadline: '🔔', meeting: '📋', other: '💡' };
      for (const s of scheduleRes.data ?? []) {
        const t = new Date(s.start_time);
        const timeStr = `${t.getHours() >= 12 ? '오후' : '오전'} ${t.getHours() > 12 ? t.getHours() - 12 : t.getHours()}시`;
        actionItems.push({
          id: s.id,
          type: 'schedule_today',
          title: s.title,
          subtitle: `오늘 ${timeStr}`,
          icon: TYPE_ICON[s.type] ?? '📌',
          color: '#2563EB',
          bg: '#DBEAFE',
          urgent: false,
        });
      }

      if (pendingSettlement > 0) {
        actionItems.push({
          id: 'unsettled',
          type: 'unsettled',
          title: `정산 대기 ${pendingSettlement.toLocaleString('ko-KR')}원`,
          subtitle: '협상 중인 협찬의 예상 수령액',
          icon: '💳',
          color: '#059669',
          bg: '#D1FAE5',
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
