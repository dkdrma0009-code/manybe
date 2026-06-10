import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../api/supabase';
import { makeLogger } from '../utils/logger';

const log = makeLogger('Realtime');

// ─── Types ────────────────────────────────────────────────────────────────────

interface RealtimeContextValue {
  /** Increments whenever a deals row changes — watch to trigger refetch */
  dealsVersion: number;
  /** Increments whenever an inquiry row changes */
  inquiriesVersion: number;
  /** Increments whenever a schedule row changes */
  schedulesVersion: number;
  /** Increments whenever a revenue row changes */
  revenuesVersion: number;
  /** Increments whenever an advertiser_proposals row changes (creator side) */
  proposalsVersion: number;
  /** Unread inquiry count — synced from realtime + initial load */
  unreadInquiryCount: number;
  /** Call from InquiryScreen after it marks rows as read */
  syncUnreadCount: (count: number) => void;
  /** Unread brand message count across all proposal threads */
  unreadProposalMessageCount: number;
  /** Re-fetch unread proposal message count from DB */
  refreshUnreadProposalCount: () => void;
  /** Force all versions up — used after foreground resume to catch missed changes */
  forceRefreshAll: () => void;
}

const DEFAULT: RealtimeContextValue = {
  dealsVersion: 0,
  inquiriesVersion: 0,
  schedulesVersion: 0,
  revenuesVersion: 0,
  proposalsVersion: 0,
  unreadInquiryCount: 0,
  syncUnreadCount: () => {},
  unreadProposalMessageCount: 0,
  refreshUnreadProposalCount: () => {},
  forceRefreshAll: () => {},
};

const RealtimeContext = createContext<RealtimeContextValue>(DEFAULT);

export function useRealtime() {
  return useContext(RealtimeContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface Props {
  userId: string | undefined;
  children: React.ReactNode;
}

export function RealtimeProvider({ userId, children }: Props) {
  const [dealsVersion,    setDealsVersion]    = useState(0);
  const [inquiriesVersion, setInquiriesVersion] = useState(0);
  const [schedulesVersion, setSchedulesVersion] = useState(0);
  const [revenuesVersion,  setRevenuesVersion]  = useState(0);
  const [proposalsVersion, setProposalsVersion] = useState(0);
  const [unreadInquiryCount, setUnreadInquiryCount] = useState(0);
  const [unreadProposalMessageCount, setUnreadProposalMessageCount] = useState(0);

  const channelsRef   = useRef<RealtimeChannel[]>([]);
  const appStateRef   = useRef<AppStateStatus>(AppState.currentState);
  const mountedRef    = useRef(true);
  const batchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBumps  = useRef(new Set<string>());

  // ── Initial unread counts ─────────────────────────────────────────────────
  const fetchUnreadProposalCount = useCallback(async () => {
    if (!userId) return;
    const { count } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('sender_role', 'brand');
    if (mountedRef.current) setUnreadProposalMessageCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('media_kit_inquiries')
      .select('id, media_kits!inner(user_id)', { count: 'exact', head: true })
      .eq('media_kits.user_id', userId)
      .eq('is_read', false)
      .then(({ count }) => {
        if (mountedRef.current) setUnreadInquiryCount(count ?? 0);
      });
    fetchUnreadProposalCount();
  }, [userId, fetchUnreadProposalCount]);

  // ── Subscription lifecycle ────────────────────────────────────────────────
  const teardown = useCallback(() => {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];
  }, []);

  useEffect(() => {
    if (!userId) return;
    mountedRef.current = true;

    // Batch rapid changes within a 120ms window to avoid N re-renders per bulk op
    function scheduleBump(table: 'deals' | 'inquiries' | 'schedules' | 'revenues' | 'proposals') {
      if (!mountedRef.current) return;
      pendingBumps.current.add(table);
      if (batchTimer.current) clearTimeout(batchTimer.current);
      batchTimer.current = setTimeout(() => {
        if (!mountedRef.current) return;
        const bumps = pendingBumps.current;
        pendingBumps.current = new Set();
        if (bumps.has('deals'))      setDealsVersion((v) => v + 1);
        if (bumps.has('inquiries'))  setInquiriesVersion((v) => v + 1);
        if (bumps.has('schedules'))  setSchedulesVersion((v) => v + 1);
        if (bumps.has('revenues'))   setRevenuesVersion((v) => v + 1);
        if (bumps.has('proposals'))  setProposalsVersion((v) => v + 1);
      }, 120);
    }

    function setup() {
      // Guard against duplicate subscriptions
      if (channelsRef.current.length > 0) teardown();

      const deals = supabase
        .channel(`realtime:deals:${userId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'deals',
          filter: `user_id=eq.${userId}`,
        }, () => scheduleBump('deals'))
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            log.warn('deals channel error — will retry on foreground');
          }
        });

      // media_kit_inquiries has no direct user_id — rely on RLS for security
      const inquiries = supabase
        .channel(`realtime:inquiries:${userId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'media_kit_inquiries',
        }, (payload) => {
          scheduleBump('inquiries');
          if (payload.eventType === 'INSERT') {
            if (mountedRef.current) setUnreadInquiryCount((n) => n + 1);
          }
        })
        .subscribe();

      const schedules = supabase
        .channel(`realtime:schedules:${userId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'schedules',
          filter: `user_id=eq.${userId}`,
        }, () => scheduleBump('schedules'))
        .subscribe();

      const revenues = supabase
        .channel(`realtime:revenues:${userId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'revenues',
          filter: `user_id=eq.${userId}`,
        }, () => scheduleBump('revenues'))
        .subscribe();

      const chatMessages = supabase
        .channel(`realtime:chat_messages:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'chat_messages',
        }, (payload) => {
          const msg = payload.new as { sender_role: string; is_read: boolean };
          if (msg.sender_role === 'brand' && !msg.is_read) {
            if (mountedRef.current) setUnreadProposalMessageCount((n) => n + 1);
          }
        })
        .subscribe();

      // 광고주가 보낸 협찬 제안 — 크리에이터가 실시간으로 새 제안을 받도록
      const proposals = supabase
        .channel(`realtime:proposals:${userId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'advertiser_proposals',
          filter: `creator_id=eq.${userId}`,
        }, () => scheduleBump('proposals'))
        .subscribe();

      channelsRef.current = [deals, inquiries, schedules, revenues, chatMessages, proposals];
    }

    setup();

    // ── AppState: unsubscribe in background, refetch on foreground ──────────
    const appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev.match(/inactive|background/) && next === 'active') {
        // Came back to foreground — reconnect and force full refetch to catch
        // any changes that arrived while channels were paused/disconnected.
        setup();
        if (mountedRef.current) {
          setDealsVersion((v) => v + 1);
          setInquiriesVersion((v) => v + 1);
          setSchedulesVersion((v) => v + 1);
          setRevenuesVersion((v) => v + 1);
          setProposalsVersion((v) => v + 1);
        }
      } else if (next.match(/inactive|background/)) {
        // Going to background — release channels to save server connections.
        teardown();
      }
    });

    return () => {
      mountedRef.current = false;
      if (batchTimer.current) clearTimeout(batchTimer.current);
      teardown();
      appStateSub.remove();
    };
  }, [userId, teardown]);

  const syncUnreadCount = useCallback((count: number) => {
    setUnreadInquiryCount(count);
  }, []);

  const refreshUnreadProposalCount = useCallback(() => {
    fetchUnreadProposalCount();
  }, [fetchUnreadProposalCount]);

  const forceRefreshAll = useCallback(() => {
    setDealsVersion((v) => v + 1);
    setInquiriesVersion((v) => v + 1);
    setSchedulesVersion((v) => v + 1);
    setRevenuesVersion((v) => v + 1);
    setProposalsVersion((v) => v + 1);
  }, []);

  return (
    <RealtimeContext.Provider value={{
      dealsVersion,
      inquiriesVersion,
      schedulesVersion,
      revenuesVersion,
      proposalsVersion,
      unreadInquiryCount,
      syncUnreadCount,
      unreadProposalMessageCount,
      refreshUnreadProposalCount,
      forceRefreshAll,
    }}>
      {children}
    </RealtimeContext.Provider>
  );
}
