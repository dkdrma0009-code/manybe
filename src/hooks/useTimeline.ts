import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';
import {
  TimelineItem, TimelineGroup, TimelineSeverity, TimelineEventType,
  SEVERITY_ORDER,
} from '../types/timeline';
import { makeLogger } from '../utils/logger';

const log = makeLogger('useTimeline');
const STORAGE_KEY = 'timeline_read_v1';
const READ_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Read-state persistence ────────────────────────────────────────────────────

async function loadReadIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const entries: [string, number][] = JSON.parse(raw);
    const cutoff = Date.now() - READ_TTL_MS;
    return new Set(entries.filter(([, t]) => t > cutoff).map(([id]) => id));
  } catch {
    return new Set();
  }
}

async function persistReadId(id: string, existing: Set<string>): Promise<void> {
  try {
    const all = Array.from(existing).map((i) => [i, Date.now()] as [string, number]);
    all.push([id, Date.now()]);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    log.warn('persistReadId failed:', e);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeItem(
  id: string,
  type: TimelineEventType,
  severity: TimelineSeverity,
  title: string,
  subtitle: string,
  timestamp: string,
  opts: Partial<Omit<TimelineItem, 'id'|'type'|'severity'|'title'|'subtitle'|'timestamp'|'isRead'>> = {}
): Omit<TimelineItem, 'isRead'> {
  const CONFIG: Record<TimelineSeverity, { icon: string; color: string; bg: string }> = {
    critical: { icon: '🔴', color: '#C13C3C', bg: '#FBE5E5' },
    warning:  { icon: '🟡', color: '#C68318', bg: '#FBF1DC' },
    info:     { icon: '🔵', color: '#3B6FD9', bg: '#E3ECFB' },
    success:  { icon: '🟢', color: '#2E8C5D', bg: '#DEEFE5' },
  };
  const def = CONFIG[severity];
  return {
    id, type, severity, title, subtitle, timestamp,
    icon: opts.icon ?? def.icon,
    color: opts.color ?? def.color,
    bg: opts.bg ?? def.bg,
    ...opts,
  };
}

function groupByDate(items: TimelineItem[]): TimelineGroup[] {
  const now = new Date();
  const todayStr   = now.toISOString().split('T')[0];
  const weekAgo    = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const today:   TimelineItem[] = [];
  const thisWeek: TimelineItem[] = [];
  const older:   TimelineItem[] = [];

  for (const item of items) {
    const d = item.timestamp.slice(0, 10);
    if (d === todayStr) today.push(item);
    else if (d >= weekAgoStr) thisWeek.push(item);
    else older.push(item);
  }

  const byPriority = (a: TimelineItem, b: TimelineItem) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
    b.timestamp.localeCompare(a.timestamp);

  const groups: TimelineGroup[] = [];
  if (today.length)    groups.push({ label: '오늘',   items: today.sort(byPriority) });
  if (thisWeek.length) groups.push({ label: '이번 주', items: thisWeek.sort(byPriority) });
  if (older.length)    groups.push({ label: '이전',   items: older.sort(byPriority) });
  return groups;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useTimeline(userId: string | undefined) {
  const [groups,       setGroups]       = useState<TimelineGroup[]>([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [loading,      setLoading]      = useState(!!userId);
  const readIdsRef = useRef<Set<string>>(new Set());

  const build = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    const now = new Date();
    const todayStr   = now.toISOString().split('T')[0];
    const weekLater  = new Date(now); weekLater.setDate(now.getDate() + 7);
    const weekLaterStr = weekLater.toISOString().split('T')[0];
    const day7Ago    = new Date(now); day7Ago.setDate(now.getDate() - 7);
    const day7AgoStr = day7Ago.toISOString().split('T')[0];
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const [activeRes, overdueRes, deadlineRes, settledRes, schedRes, inquiryRes] = await Promise.all([
      // Active deals — for settlement delay detection
      supabase
        .from('deals')
        .select('id, brand, title, amount, status, end_date, created_at')
        .eq('user_id', userId)
        .in('status', ['inquiry', 'reviewing', 'in_progress', 'uploaded']),

      // Overdue: past end_date and not settled
      supabase
        .from('deals')
        .select('id, brand, title, end_date, status')
        .eq('user_id', userId)
        .in('status', ['inquiry', 'reviewing', 'in_progress', 'uploaded'])
        .lt('end_date', todayStr)
        .order('end_date', { ascending: true }),

      // Deadline this week
      supabase
        .from('deals')
        .select('id, brand, title, end_date, amount')
        .eq('user_id', userId)
        .in('status', ['inquiry', 'reviewing', 'in_progress', 'uploaded'])
        .gte('end_date', todayStr)
        .lte('end_date', weekLaterStr)
        .order('end_date', { ascending: true }),

      // Recently settled (last 7 days) — success events
      supabase
        .from('deals')
        .select('id, brand, title, amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'settled')
        .gte('created_at', day7AgoStr)
        .order('created_at', { ascending: false })
        .limit(5),

      // Today's schedules
      supabase
        .from('schedules')
        .select('id, title, type, start_time')
        .eq('user_id', userId)
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
        .order('start_time', { ascending: true }),

      // Unread inquiries
      supabase
        .from('media_kit_inquiries')
        .select('id, brand_name, created_at, media_kits!inner(user_id)')
        .eq('media_kits.user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Load persisted read state
    const readIds = await loadReadIds();
    readIdsRef.current = readIds;

    const raw: Omit<TimelineItem, 'isRead'>[] = [];

    // ── Overdue ──────────────────────────────────────────────────────────────
    for (const d of overdueRes.data ?? []) {
      if (!d.end_date) continue;
      const daysOver = Math.floor(
        (new Date(todayStr).getTime() - new Date(d.end_date.slice(0, 10)).getTime()) / 86400000
      );
      raw.push(makeItem(
        `overdue_${d.id}`, 'overdue', 'critical',
        `${d.brand} 마감 D+${daysOver}`,
        `${d.title} · 마감일이 ${daysOver}일 지났어요`,
        d.end_date.slice(0, 10) + 'T00:00:00',
        { icon: '🔴', entityId: d.id, entityType: 'deal', navigateTo: { screen: 'deals' }, cta: '상태 업데이트' },
      ));
    }

    // ── Settlement delay ──────────────────────────────────────────────────────
    const now_ms = Date.now();
    for (const d of activeRes.data ?? []) {
      if (d.status !== 'uploaded' || !d.created_at) continue;
      const daysSince = Math.floor((now_ms - new Date(d.created_at).getTime()) / 86400000);
      if (daysSince < 14) continue;
      const isLong = daysSince > 30;
      raw.push(makeItem(
        `settlement_delay_${d.id}`, 'settlement_delay', isLong ? 'critical' : 'warning',
        `${d.brand} 정산 대기 ${daysSince}일째`,
        `업로드 완료 후 정산이 지연되고 있어요`,
        d.created_at,
        { icon: '💳', entityId: d.id, entityType: 'deal', navigateTo: { screen: 'revenue' }, cta: '수익 기록' },
      ));
    }

    // ── Deadline today / this week ──────────────────────────────────────────
    for (const d of deadlineRes.data ?? []) {
      if (!d.end_date) continue;
      const endStr = d.end_date.slice(0, 10);
      const isToday = endStr === todayStr;
      const daysLeft = Math.ceil((new Date(endStr).getTime() - new Date(todayStr).getTime()) / 86400000);
      raw.push(makeItem(
        `deadline_${d.id}`,
        isToday ? 'deadline_today' : 'deadline_week',
        isToday ? 'critical' : 'warning',
        `${d.brand} 마감 ${isToday ? 'D-0 오늘' : `D-${daysLeft}`}`,
        d.title,
        endStr + 'T00:00:00',
        { icon: isToday ? '🔔' : '⏰', entityId: d.id, entityType: 'deal', navigateTo: { screen: 'deals' }, cta: '단계 이동' },
      ));
    }

    // ── Unread inquiries ──────────────────────────────────────────────────────
    for (const i of inquiryRes.data ?? []) {
      raw.push(makeItem(
        `inquiry_${i.id}`, 'inquiry_received', 'warning',
        `${i.brand_name} 협찬 문의`,
        '답변하거나 협찬으로 전환하세요',
        i.created_at ?? new Date().toISOString(),
        { icon: '📬', color: '#6E56F0', bg: '#EAE3FF', entityId: i.id, entityType: 'inquiry', navigateTo: { screen: 'inquiries' }, cta: '문의 확인' },
      ));
    }

    // ── Today's schedules ─────────────────────────────────────────────────────
    const SCHED_ICONS: Record<string, string> = { content: '📤', deadline: '🔔', meeting: '📋', other: '💡' };
    for (const s of schedRes.data ?? []) {
      if (!s.start_time) continue;
      const t = new Date(s.start_time);
      const timeStr = `${t.getHours() >= 12 ? '오후' : '오전'} ${t.getHours() > 12 ? t.getHours() - 12 : t.getHours()}시`;
      raw.push(makeItem(
        `schedule_${s.id}`, 'schedule_today', 'info',
        s.title,
        `오늘 ${timeStr}`,
        s.start_time,
        { icon: SCHED_ICONS[s.type] ?? '📌', navigateTo: { screen: 'calendar' } },
      ));
    }

    // ── Recently settled (success events) ─────────────────────────────────────
    for (const d of settledRes.data ?? []) {
      const amt = d.amount ?? 0;
      raw.push(makeItem(
        `settled_${d.id}`, 'settlement_completed', 'success',
        `${d.brand} 협찬 완료`,
        amt > 0 ? `${amt.toLocaleString('ko-KR')}원 정산 완료` : '협찬이 완료됐어요',
        d.created_at ?? new Date().toISOString(),
        { icon: '✅', navigateTo: { screen: 'revenue' }, cta: '수익 기록' },
      ));
    }

    // ── New active deals (created last 3 days) ────────────────────────────────
    const day3Ago = new Date(now); day3Ago.setDate(now.getDate() - 3);
    const day3AgoStr = day3Ago.toISOString();
    for (const d of activeRes.data ?? []) {
      if (!d.created_at || d.created_at < day3AgoStr) continue;
      if (['overdue', 'deadline'].some((k) => raw.some((r) => r.id.includes(k) && r.entityId === d.id))) continue;
      raw.push(makeItem(
        `new_deal_${d.id}`, 'deal_created', 'info',
        `${d.brand} 협찬 추가됨`,
        d.title,
        d.created_at,
        { icon: '🤝', entityId: d.id, entityType: 'deal', navigateTo: { screen: 'deals' } },
      ));
    }

    // ── Attach read state and group ────────────────────────────────────────────
    const items: TimelineItem[] = raw.map((r) => ({ ...r, isRead: readIds.has(r.id) }));
    const unread = items.filter((i) => !i.isRead && i.severity !== 'success' && i.severity !== 'info').length;

    setGroups(groupByDate(items));
    setUnreadCount(unread);
    setLoading(false);
  }, [userId]);

  useEffect(() => { build(); }, [build]);

  const markRead = useCallback(async (id: string) => {
    readIdsRef.current.add(id);
    await persistReadId(id, readIdsRef.current);
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((i) => i.id === id ? { ...i, isRead: true } : i),
      }))
    );
    setUnreadCount((n) => Math.max(0, n - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    setGroups((prev) => {
      const allIds: string[] = [];
      const next = prev.map((g) => ({
        ...g,
        items: g.items.map((i) => { allIds.push(i.id); return { ...i, isRead: true }; }),
      }));
      allIds.forEach((id) => readIdsRef.current.add(id));
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(readIdsRef.current).map((id) => [id, Date.now()]))
      ).catch(() => {});
      return next;
    });
    setUnreadCount(0);
  }, []);

  return { groups, unreadCount, loading, refetch: build, markRead, markAllRead };
}
