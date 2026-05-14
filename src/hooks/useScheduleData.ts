import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { Schedule } from '../types';

export type DisplayType = '업로드 예정' | '협찬 마감' | '미팅' | '기타';

export interface ScheduleItem {
  id: string;
  type: DisplayType;
  title: string;
  time: string;
  color: string;
  iconBg: string;
}

export interface WeekSummaryItem {
  label: string;
  count: number;
  color: string;
  bg: string;
}

export interface ScheduleData {
  dotEvents: Record<number, { color: string }[]>;
  schedulesByDate: Record<number, ScheduleItem[]>;
  weekSummary: WeekSummaryItem[];
}

const TYPE_CONFIG: Record<Schedule['type'], { label: DisplayType; color: string; iconBg: string; dotColor: string }> = {
  content:  { label: '업로드 예정', color: '#6E56F0', iconBg: '#EAE3FF', dotColor: '#6E56F0' },
  deadline: { label: '협찬 마감',   color: '#C68318', iconBg: '#FBF1DC', dotColor: '#C68318' },
  meeting:  { label: '미팅',        color: '#3B6FD9', iconBg: '#E3ECFB', dotColor: '#3B6FD9' },
  other:    { label: '기타',        color: '#10B981', iconBg: '#D1FAE5', dotColor: '#10B981' },
};

function formatKoreanTime(isoTime: string): string {
  const d = new Date(isoTime);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? '오후' : '오전';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${period} ${hour}시` : `${period} ${hour}시 ${m}분`;
}

const DEFAULT_DATA: ScheduleData = {
  dotEvents: {},
  schedulesByDate: {},
  weekSummary: [],
};

export function useScheduleData(
  userId: string | undefined,
  year: number,
  month: number,
) {
  const [data, setData] = useState<ScheduleData>(DEFAULT_DATA);
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
      const monthStart = new Date(year, month, 1).toISOString();
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data: rows, error: err } = await supabase
        .from('schedules')
        .select('id, title, type, start_time')
        .eq('user_id', userId)
        .gte('start_time', monthStart)
        .lte('start_time', monthEnd)
        .order('start_time', { ascending: true });

      if (err) throw err;

      const dotEvents: Record<number, { color: string }[]> = {};
      const schedulesByDate: Record<number, ScheduleItem[]> = {};

      for (const r of rows ?? []) {
        const d = new Date(r.start_time);
        const day = d.getDate();
        const cfg = TYPE_CONFIG[r.type as Schedule['type']] ?? TYPE_CONFIG.other;

        // Dot events
        if (!dotEvents[day]) dotEvents[day] = [];
        if (dotEvents[day].length < 3) dotEvents[day].push({ color: cfg.dotColor });

        // Schedule items
        if (!schedulesByDate[day]) schedulesByDate[day] = [];
        schedulesByDate[day].push({
          id: r.id,
          type: cfg.label,
          title: r.title,
          time: formatKoreanTime(r.start_time),
          color: cfg.color,
          iconBg: cfg.iconBg,
        });
      }

      // This week summary: Sun–Sat containing today
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekCounts: Record<string, number> = {};
      for (const r of rows ?? []) {
        const d = new Date(r.start_time);
        if (d >= weekStart && d <= weekEnd) {
          const cfg = TYPE_CONFIG[r.type as Schedule['type']] ?? TYPE_CONFIG.other;
          weekCounts[cfg.label] = (weekCounts[cfg.label] ?? 0) + 1;
        }
      }

      const SUMMARY_CONFIG: { label: DisplayType; color: string; bg: string }[] = [
        { label: '업로드 예정', color: '#6E56F0', bg: '#EAE3FF' },
        { label: '협찬 마감',   color: '#C68318', bg: '#FBF1DC' },
        { label: '미팅',        color: '#3B6FD9', bg: '#E3ECFB' },
        { label: '기타',        color: '#10B981', bg: '#D1FAE5' },
      ];
      const weekSummary: WeekSummaryItem[] = SUMMARY_CONFIG
        .map((s) => ({ ...s, count: weekCounts[s.label] ?? 0 }))
        .filter((s) => s.count > 0);

      setData({ dotEvents, schedulesByDate, weekSummary });
    } catch (e: any) {
      setError(e.message ?? '데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [userId, year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
