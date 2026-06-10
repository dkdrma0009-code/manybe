import { Text } from '@/components/Text';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../context/RealtimeContext';
import { theme } from '../../constants/theme';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const { colors, space, radius, typography } = theme;

const REJECTION_REASONS = [
  '금액이 맞지 않음',
  '브랜드/제품이 채널과 맞지 않음',
  '일정이 안 됨',
  '이미 경쟁 브랜드 광고 중',
  '기타',
];

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

interface ChatMessage {
  id: string;
  sender_role: 'creator' | 'brand';
  content: string;
  created_at: string;
  is_read: boolean;
}

const AVATAR_COLORS = ['#E8472A', '#3D5AFE', '#1D8348', '#C48A40', '#8B5CF6', '#0F9B8E'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const insets    = useSafeAreaInsets();
  const route     = useRoute<ChatRouteProp>();
  const nav       = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user }  = useAuth();

  const { proposalId, brandName, proposalMessage, amount, status: initialStatus } = route.params;

  const [threadId, setThreadId]   = useState<string | null>(null);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [proposalStatus, setProposalStatus] = useState(initialStatus);
  const [actionLoading, setActionLoading]   = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);

  const { refreshUnreadProposalCount } = useRealtime();
  const listRef = useRef<FlatList>(null);
  const bgColor = avatarColor(brandName);
  const amountStr = amount > 0 ? `₩${amount.toLocaleString()}` : '';

  // 스레드 초기화: 없으면 만들고 첫 브랜드 메시지 삽입
  const initThread = useCallback(async () => {
    if (!user) return;

    const { data: existing } = await supabase
      .from('message_threads')
      .select('id')
      .eq('proposal_id', proposalId)
      .single();

    let tid: string;
    if (existing) {
      tid = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from('message_threads')
        .insert({ proposal_id: proposalId, creator_id: user.id })
        .select('id')
        .single();
      if (error || !created) return;
      tid = created.id;
      // 원본 제안 메시지를 첫 브랜드 메시지로 삽입
      await supabase.from('chat_messages').insert({
        thread_id: tid,
        sender_role: 'brand',
        content: proposalMessage,
      });
    }

    setThreadId(tid);

    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('id, sender_role, content, created_at, is_read')
      .eq('thread_id', tid)
      .order('created_at', { ascending: true });

    setMessages(msgs ?? []);

    // 브랜드 메시지 읽음 처리
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('thread_id', tid)
      .eq('sender_role', 'brand')
      .eq('is_read', false);

    // 로컬 상태도 읽음으로 업데이트
    setMessages((prev) => prev.map((m) =>
      m.sender_role === 'brand' ? { ...m, is_read: true } : m,
    ));

    refreshUnreadProposalCount();
  }, [user, proposalId, proposalMessage, refreshUnreadProposalCount]);

  useEffect(() => { initThread(); }, [initThread]);

  // Realtime 구독
  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`chat:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const newMsg = { ...payload.new, is_read: false } as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            // 브랜드 메시지 수신 시 즉시 읽음 처리
            if (newMsg.sender_role === 'brand' && threadId) {
              supabase.from('chat_messages').update({ is_read: true }).eq('id', newMsg.id);
              newMsg.is_read = true;
            }
            return [...prev, newMsg];
          });
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((m) => m.id === updated.id ? { ...m, is_read: updated.is_read } : m)
          );
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [threadId]);

  async function sendMessage() {
    if (!text.trim() || !threadId || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    await supabase.from('chat_messages').insert({
      thread_id: threadId,
      sender_role: 'creator',
      content,
    });
    setSending(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function handleProposalAction(action: 'accepted' | 'rejected', reason?: string) {
    setActionLoading(true);
    await supabase
      .from('advertiser_proposals')
      .update({ status: action, ...(reason ? { rejection_reason: reason } : {}) })
      .eq('id', proposalId);
    setProposalStatus(action);
    setActionLoading(false);

    const noticeContent = action === 'accepted'
      ? '✓ 협찬 제안을 수락했습니다.'
      : `✗ 협찬 제안을 거절했습니다.${reason ? ` (${reason})` : ''}`;
    if (threadId) {
      await supabase.from('chat_messages').insert({
        thread_id: threadId,
        sender_role: 'creator',
        content: noticeContent,
      });
    }
  }

  function renderMessage({ item, index }: { item: ChatMessage; index: number }) {
    const isCreator = item.sender_role === 'creator';
    const prevItem  = index > 0 ? messages[index - 1] : null;
    const nextItem  = index < messages.length - 1 ? messages[index + 1] : null;
    const sameGroup = prevItem?.sender_role === item.sender_role;
    // 같은 그룹의 마지막 메시지에만 시간/읽음 표시
    const isLastInGroup = !nextItem || nextItem.sender_role !== item.sender_role;

    return (
      <View style={[cs.msgWrapper, isCreator ? cs.creatorWrapper : cs.brandWrapper]}>
        {!isCreator && !sameGroup && (
          <View style={[cs.bubbleAvatar, { backgroundColor: bgColor }]}>
            <Text style={cs.bubbleAvatarText}>{brandName.charAt(0)}</Text>
          </View>
        )}
        {!isCreator && sameGroup && <View style={{ width: 32 }} />}
        <View style={{ maxWidth: '72%' }}>
          {!isCreator && !sameGroup && (
            <Text style={cs.senderName}>{brandName}</Text>
          )}
          <View style={[cs.bubble, isCreator ? cs.creatorBubble : cs.brandBubble]}>
            <Text style={[cs.bubbleText, isCreator && cs.creatorText]}>{item.content}</Text>
          </View>
          {isLastInGroup && (
            <View style={[cs.metaRow, isCreator ? cs.metaRight : cs.metaLeft]}>
              {item.is_read && (
                <Text style={cs.readText}>읽음</Text>
              )}
              <Text style={cs.timeText}>{formatTime(item.created_at)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[cs.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* 헤더 */}
      <View style={cs.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={cs.backBtn}>
          <Text style={cs.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={[cs.headerAvatar, { backgroundColor: bgColor }]}>
          <Text style={cs.headerAvatarText}>{brandName.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cs.headerName}>{brandName}</Text>
          {!!amountStr && <Text style={cs.headerAmount}>{amountStr}</Text>}
        </View>
      </View>

      {/* 제안 수락/거절 배너 */}
      {proposalStatus === 'pending' ? (
        <View style={cs.proposalBanner}>
          <Text style={cs.proposalBannerText}>협찬 제안에 답변해주세요</Text>
          <View style={cs.proposalBtnRow}>
            <TouchableOpacity
              style={cs.rejectBtn}
              onPress={() => setRejectModalVisible(true)}
              disabled={actionLoading}
            >
              <Text style={cs.rejectText}>거절</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cs.acceptBtn, actionLoading && { opacity: 0.6 }]}
              onPress={() => handleProposalAction('accepted')}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={cs.acceptText}>수락</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[cs.statusBadge, proposalStatus === 'accepted' ? cs.statusAccepted : cs.statusRejected]}>
          <Text style={[cs.statusBadgeText, { color: proposalStatus === 'accepted' ? colors.ai.from : colors.text.tertiary }]}>
            {proposalStatus === 'accepted' ? '✓ 수락된 협찬' : '✗ 거절된 협찬'}
          </Text>
        </View>
      )}

      {/* 메시지 목록 */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={cs.list}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
      />

      {/* 입력창 */}
      <View style={[cs.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={cs.input}
          value={text}
          onChangeText={setText}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor={colors.text.muted}
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[cs.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={cs.sendIcon}>↑</Text>
          }
        </TouchableOpacity>
      </View>

      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <Pressable style={cs.overlay} onPress={() => setRejectModalVisible(false)}>
          <Pressable style={cs.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={cs.sheetTitle}>거절 이유를 선택해주세요</Text>
            {REJECTION_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={cs.reasonRow}
                activeOpacity={0.7}
                onPress={() => {
                  setRejectModalVisible(false);
                  handleProposalAction('rejected', reason);
                }}
              >
                <Text style={cs.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={cs.cancelRow} onPress={() => setRejectModalVisible(false)} activeOpacity={0.7}>
              <Text style={cs.cancelText}>취소</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.screen, paddingVertical: space.md, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.default, gap: space.sm },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 28, color: colors.text.primary, lineHeight: 32 },
  headerAvatar: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 14, fontWeight: '700', color: colors.text.inverse },
  headerName:   { ...typography.bodyStrong, color: colors.text.primary },
  headerAmount: { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },

  proposalBanner: { backgroundColor: colors.ai.surface, paddingHorizontal: space.screen, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  proposalBannerText: { ...typography.caption, color: colors.ai.text, fontWeight: '600', flex: 1 },
  proposalBtnRow: { flexDirection: 'row', gap: space.xs },
  rejectBtn: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.surface2 },
  rejectText: { ...typography.buttonSm, color: colors.text.tertiary },
  acceptBtn: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.ai.from },
  acceptText: { ...typography.buttonSm, color: colors.text.inverse },

  statusBadge: { paddingHorizontal: space.screen, paddingVertical: 6, alignItems: 'center' },
  statusAccepted: { backgroundColor: colors.semantic.successBg },
  statusRejected: { backgroundColor: colors.surface1 },
  statusBadgeText: { ...typography.caption, fontWeight: '600' },

  list: { paddingHorizontal: space.screen, paddingVertical: space.md, gap: 4 },

  msgWrapper:    { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  creatorWrapper:{ justifyContent: 'flex-end' },
  brandWrapper:  { justifyContent: 'flex-start', gap: 6 },

  bubbleAvatar:     { width: 32, height: 32, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  bubbleAvatarText: { fontSize: 12, fontWeight: '700', color: colors.text.inverse },
  senderName:       { ...typography.micro, color: colors.text.tertiary, marginBottom: 3, marginLeft: 2 },

  bubble:       { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  brandBubble:  { backgroundColor: colors.surface, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  creatorBubble:{ backgroundColor: colors.ai.from, borderBottomRightRadius: 4 },
  bubbleText:   { ...typography.body, color: colors.text.primary, lineHeight: 20 },
  creatorText:  { color: colors.text.inverse },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  metaLeft:  { marginLeft: 4 },
  metaRight: { justifyContent: 'flex-end', marginRight: 4 },
  readText:  { ...typography.micro, color: colors.ai.from, fontWeight: '600' },
  timeText:  { ...typography.micro, color: colors.text.muted },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space.screen, paddingTop: space.sm, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.default, gap: space.sm },
  input:    { flex: 1, backgroundColor: colors.ai.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: colors.text.primary, maxHeight: 120, borderWidth: 1.5, borderColor: colors.ai.muted },
  sendBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ai.from, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { fontSize: 18, color: colors.text.inverse, fontWeight: '700' },

  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xl },
  sheetTitle:{ ...typography.bodyStrong, color: colors.text.primary, marginBottom: space.md, textAlign: 'center' },
  reasonRow: { paddingVertical: space.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.surface2 },
  reasonText:{ ...typography.body, color: colors.text.primary, textAlign: 'center' },
  cancelRow: { paddingVertical: space.sm + 2, marginTop: space.xs },
  cancelText:{ ...typography.body, color: colors.text.muted, textAlign: 'center' },
});
