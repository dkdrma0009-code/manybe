import { Text } from '@/components/Text';
import React, { useState, useCallback } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../api/supabase';
import { theme } from '../../constants/theme';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const { colors, space, radius, typography } = theme;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  brand: string;
  preview: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected';
  amount: number;
  unreadCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return '어제';
  if (day < 7) return `${day}일 전`;
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

const AVATAR_COLORS = ['#E8472A', '#3D5AFE', '#1D8348', '#C48A40', '#8B5CF6', '#0F9B8E'];
function avatarColor(brand: string) {
  let h = 0;
  for (let i = 0; i < brand.length; i++) h = brand.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function tags(msg: Message): { label: string; color: string }[] {
  const result: { label: string; color: string }[] = [];
  if (msg.status === 'pending') {
    result.push({ label: '답장 필요', color: colors.brand.default });
  } else if (msg.status === 'accepted') {
    result.push({ label: '진행 중', color: colors.ai.from });
  } else {
    result.push({ label: '거절됨', color: colors.text.tertiary });
  }
  result.push({ label: '협찬', color: colors.text.tertiary });
  return result;
}

type Filter = '전체' | '답장 필요' | '정산';

// ─── Message Row ──────────────────────────────────────────────────────────────

function MessageRow({ msg, onPress }: { msg: Message; onPress: () => void }) {
  const initial  = msg.brand.charAt(0);
  const bgColor  = avatarColor(msg.brand);
  const rowTags  = tags(msg);
  const hasUnread = msg.unreadCount > 0;

  return (
    <TouchableOpacity style={mr.row} activeOpacity={0.8} onPress={onPress}>
      <View style={mr.avatarWrap}>
        <View style={[mr.avatar, { backgroundColor: bgColor }]}>
          <Text style={mr.avatarText}>{initial}</Text>
        </View>
        {hasUnread && (
          <View style={mr.badge}>
            <Text style={mr.badgeText}>{msg.unreadCount > 99 ? '99+' : msg.unreadCount}</Text>
          </View>
        )}
      </View>
      <View style={mr.body}>
        <View style={mr.topRow}>
          <Text style={[mr.brand, hasUnread && mr.brandUnread]}>{msg.brand}</Text>
          <Text style={mr.time}>{formatRelative(msg.timestamp)}</Text>
        </View>
        <Text style={[mr.preview, hasUnread && mr.previewUnread]} numberOfLines={2}>
          {msg.preview}
        </Text>
        <View style={mr.tags}>
          {rowTags.map((t) => (
            <View key={t.label} style={[mr.tag, { borderColor: t.color + '60' }]}>
              <Text style={[mr.tagText, { color: t.color }]}>{t.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const mr = StyleSheet.create({
  row:          { flexDirection: 'row', paddingVertical: space.md + 2, gap: space.md, alignItems: 'flex-start' },
  avatarWrap:   { position: 'relative', marginTop: 2 },
  avatar:       { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
  badge:        { position: 'absolute', top: -4, right: -4, backgroundColor: colors.semantic.error, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: colors.surface },
  badgeText:    { fontSize: 10, fontWeight: '800', color: colors.text.inverse },
  body:         { flex: 1 },
  topRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
  brand:        { ...typography.bodyStrong, color: colors.text.primary },
  brandUnread:  { color: colors.text.primary, fontWeight: '800' },
  time:         { ...typography.caption, color: colors.text.muted },
  preview:      { ...typography.body, color: colors.text.secondary, lineHeight: 19 },
  previewUnread:{ color: colors.text.primary },
  tags:         { flexDirection: 'row', gap: space.xs, marginTop: space.xs, flexWrap: 'wrap' },
  tag:          { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagText:      { ...typography.micro, fontWeight: '500' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(false);
  const [filter, setFilter]     = useState<Filter>('전체');

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: proposals }, { data: threads }] = await Promise.all([
        supabase
          .from('advertiser_proposals')
          .select('id, brand_name, message, amount, status, created_at')
          .eq('creator_id', user.id),
        supabase
          .from('message_threads')
          .select('id, proposal_id, last_message_at')
          .eq('creator_id', user.id),
      ]);

      const threadMap = new Map((threads ?? []).map((t) => [t.proposal_id, t]));

      const threadIds = (threads ?? []).map((t) => t.id);
      const unreadMap = new Map<string, number>();
      const lastMsgMap = new Map<string, string>();

      if (threadIds.length > 0) {
        const [{ data: unread }, { data: lastMsgs }] = await Promise.all([
          supabase
            .from('chat_messages')
            .select('thread_id')
            .in('thread_id', threadIds)
            .eq('sender_role', 'brand')
            .eq('is_read', false),
          supabase
            .from('chat_messages')
            .select('thread_id, content, sender_role')
            .in('thread_id', threadIds)
            .order('created_at', { ascending: false }),
        ]);
        (unread ?? []).forEach((u) => {
          unreadMap.set(u.thread_id, (unreadMap.get(u.thread_id) ?? 0) + 1);
        });
        // 스레드별 최신 메시지만 보관
        (lastMsgs ?? []).forEach((m) => {
          if (!lastMsgMap.has(m.thread_id)) {
            const prefix = m.sender_role === 'creator' ? '나: ' : '';
            lastMsgMap.set(m.thread_id, prefix + m.content);
          }
        });
      }

      const msgs: Message[] = (proposals ?? []).map((d) => {
        const thread = threadMap.get(d.id);
        const lastMsg = thread ? lastMsgMap.get(thread.id) : undefined;
        return {
          id:          d.id,
          brand:       d.brand_name,
          preview:     lastMsg ?? d.message,
          timestamp:   thread?.last_message_at ?? d.created_at,
          status:      d.status as Message['status'],
          amount:      d.amount,
          unreadCount: thread ? (unreadMap.get(thread.id) ?? 0) : 0,
        };
      });

      msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setMessages(msgs);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchMessages(); }, [fetchMessages]));

  function openChat(msg: Message) {
    nav.navigate('Chat', {
      proposalId:      msg.id,
      brandName:       msg.brand,
      proposalMessage: msg.preview,
      amount:          msg.amount,
      status:          msg.status,
    });
  }

  const filtered = messages.filter((m) => {
    if (filter === '답장 필요') return m.status === 'pending';
    if (filter === '정산') return m.status === 'accepted' && m.amount > 0;
    return true;
  });

  const pendingCount = messages.filter((m) => m.status === 'pending').length;
  const settledCount = messages.filter((m) => m.status === 'accepted' && m.amount > 0).length;

  const FILTERS: { label: string; count: number }[] = [
    { label: '전체',    count: messages.length },
    { label: '답장 필요', count: pendingCount },
    { label: '정산',    count: settledCount },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>메시지</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.label;
          return (
            <TouchableOpacity
              key={f.label}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setFilter(f.label as Filter)}
              activeOpacity={0.7}
            >
              <Text style={[s.filterText, active && s.filterTextActive]}>
                {f.label}{f.count > 0 ? ` ${f.count}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMessages} />}
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyTitle}>메시지가 없어요</Text>
            <Text style={s.emptyDesc}>브랜드에서 협업 제안이 오면 여기에 표시됩니다</Text>
          </View>
        ) : (
          filtered.map((msg, i) => (
            <React.Fragment key={msg.id}>
              {i > 0 && <View style={s.divider} />}
              <MessageRow msg={msg} onPress={() => openChat(msg)} />
            </React.Fragment>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.screen,
    paddingVertical: space.lg,
  },
  title: { ...typography.navTitle, color: colors.text.primary },

  filterRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.screen,
    paddingBottom: space.md,
  },
  filterChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  filterChipActive: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  filterText:       { ...typography.caption, color: colors.text.secondary, fontWeight: '500' },
  filterTextActive: { color: colors.text.inverse },

  scroll:  { paddingHorizontal: space.screen },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.faint },

  empty:     { alignItems: 'center', paddingVertical: 80, gap: space.sm },
  emptyIcon: { fontSize: 40 },
  emptyTitle:{ ...typography.heading, color: colors.text.primary },
  emptyDesc: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center' },
});
