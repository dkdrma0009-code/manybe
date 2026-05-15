import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActionCenter, isDraftAction } from '../../hooks/useActionCenter';
import { colors } from '../../constants/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';
import type { AutonomousAction } from '../../types/autonomous';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ActionCenter'>;
};

type Tab = 'pending' | 'history';

const ACTION_LABELS: Record<string, { title: string; icon: string; color: string; bgColor: string }> = {
  draft_followup_message:   { title: '팔로업 메시지 초안', icon: '✉️', color: '#6E56F0', bgColor: '#F0EFFE' },
  draft_settlement_request: { title: '정산 요청 초안',    icon: '💳', color: '#059669', bgColor: '#D1FAE5' },
  draft_inquiry_response:   { title: '문의 답변 초안',    icon: '📬', color: '#0369A1', bgColor: '#E0F2FE' },
  draft_reengagement_pitch: { title: '재협업 제안 초안',  icon: '🤝', color: '#B45309', bgColor: '#FEF3C7' },
  schedule_reminder:        { title: '알림 예약',          icon: '⏰', color: '#6E56F0', bgColor: '#F0EFFE' },
  escalate_overdue:         { title: '연체 에스컬레이션',  icon: '🔴', color: '#DC2626', bgColor: '#FEE2E2' },
  suggest_calendar_adjust:  { title: '일정 조정 제안',     icon: '📅', color: '#7C3AED', bgColor: '#EDE9FE' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: '승인됨',   color: '#059669' },
  rejected: { label: '거절됨',   color: '#DC2626' },
  executed: { label: '실행됨',   color: '#6E56F0' },
  failed:   { label: '실패',     color: '#9CA3AF' },
};

// ─── Draft action card ────────────────────────────────────────────────────────

function DraftActionCard({
  action,
  getDraft,
  onApprove,
  onReject,
  onCopy,
}: {
  action: AutonomousAction;
  getDraft: (a: AutonomousAction) => Promise<string>;
  onApprove: () => void;
  onReject: () => void;
  onCopy: (text: string, edited: boolean) => void;
}) {
  const meta = ACTION_LABELS[action.type] ?? ACTION_LABELS.draft_followup_message;
  const [draft, setDraft]         = useState('');
  const [original, setOriginal]   = useState('');
  const [generating, setGenerating] = useState(true);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    getDraft(action).then((text) => {
      setDraft(text);
      setOriginal(text);
      setGenerating(false);
    });
  }, []);

  function handleCopy() {
    Clipboard.setStringAsync(draft);
    const wasEdited = draft !== original;
    onCopy(draft, wasEdited);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.actionIcon, { backgroundColor: meta.bgColor }]}>
          <Text style={styles.actionIconText}>{meta.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{meta.title}</Text>
          <Text style={styles.cardBrand}>{String(action.payload.brand ?? '')}</Text>
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: meta.bgColor }]}>
          <Text style={[styles.confidenceText, { color: meta.color }]}>
            {action.confidence}%
          </Text>
        </View>
      </View>

      {generating ? (
        <View style={styles.draftLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.draftLoadingText}>초안 생성 중...</Text>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.draftInput}
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="top"
            placeholder="초안을 편집하세요"
            placeholderTextColor="#C4C4C4"
          />
          {draft !== original && (
            <Text style={styles.editedHint}>편집됨 · 수정 내용이 반영됩니다</Text>
          )}
        </>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={onReject}
          activeOpacity={0.8}
        >
          <Text style={styles.rejectBtnText}>건너뛰기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.copyBtn, generating && { opacity: 0.5 }]}
          onPress={handleCopy}
          disabled={generating}
          activeOpacity={0.8}
        >
          <Text style={styles.copyBtnText}>{copied ? '✓ 복사됨' : '📋 복사하기'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Non-draft action card ────────────────────────────────────────────────────

function NonDraftActionCard({
  action,
  onApprove,
  onReject,
}: {
  action: AutonomousAction;
  onApprove: () => void;
  onReject: () => void;
}) {
  const meta = ACTION_LABELS[action.type] ?? {
    title: action.type, icon: '⚙️', color: '#6E56F0', bgColor: '#F0EFFE',
  };
  const brand = String(action.payload.brand ?? action.payload.title ?? '');
  const detail = String(action.payload.message ?? action.payload.body ?? action.payload.draft ?? '');

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.actionIcon, { backgroundColor: meta.bgColor }]}>
          <Text style={styles.actionIconText}>{meta.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{meta.title}</Text>
          {brand ? <Text style={styles.cardBrand}>{brand}</Text> : null}
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: meta.bgColor }]}>
          <Text style={[styles.confidenceText, { color: meta.color }]}>
            {action.confidence}%
          </Text>
        </View>
      </View>

      {detail ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailText}>{detail}</Text>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.8}>
          <Text style={styles.rejectBtnText}>거절</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveBtn} onPress={onApprove} activeOpacity={0.8}>
          <Text style={styles.approveBtnText}>승인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── History card ─────────────────────────────────────────────────────────────

function HistoryCard({ action }: { action: AutonomousAction }) {
  const meta = ACTION_LABELS[action.type] ?? {
    title: action.type, icon: '⚙️', color: '#9CA3AF', bgColor: '#F3F4F6',
  };
  const status = STATUS_LABELS[action.status] ?? { label: action.status, color: '#9CA3AF' };
  const brand = String(action.payload.brand ?? action.payload.title ?? '');
  const date = new Date(action.executedAt ?? action.createdAt).toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric',
  });

  return (
    <View style={styles.historyCard}>
      <View style={[styles.actionIcon, { backgroundColor: meta.bgColor }]}>
        <Text style={styles.actionIconText}>{meta.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.historyTitle}>{meta.title}</Text>
        {brand ? <Text style={styles.historyBrand}>{brand}</Text> : null}
      </View>
      <View style={styles.historyRight}>
        <Text style={[styles.historyStatus, { color: status.color }]}>{status.label}</Text>
        <Text style={styles.historyDate}>{date}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ActionCenterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { pending, history, loading, load, approve, reject, getDraft, trackCopy } = useActionCenter();
  const [tab, setTab] = useState<Tab>('pending');

  useEffect(() => { load(); }, []);

  const handleApprove = useCallback((id: string) => {
    Alert.alert('승인', '이 작업을 승인하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '승인', onPress: () => approve(id) },
    ]);
  }, [approve]);

  const handleReject = useCallback((id: string, isDraft: boolean) => {
    reject(id, isDraft);
  }, [reject]);

  const handleCopy = useCallback((id: string, _text: string, wasEdited: boolean) => {
    const action = pending.find((a) => a.id === id);
    if (action) trackCopy(action.type, wasEdited);
  }, [pending, trackCopy]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>AI 액션 센터</Text>
          <Text style={styles.subtitle}>AI 제안을 검토하고 승인하세요</Text>
        </View>
        {pending.length > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'pending' && styles.tabActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
            AI 제안{pending.length > 0 ? ` (${pending.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            처리 내역
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {tab === 'pending' && (
            <>
              {pending.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>🤖</Text>
                  <Text style={styles.emptyTitle}>새로운 AI 제안이 없어요</Text>
                  <Text style={styles.emptyDesc}>
                    AI가 협찬 운영을 분석해 제안이 생기면 여기에 표시됩니다.
                  </Text>
                </View>
              ) : (
                pending.map((action) =>
                  isDraftAction(action) ? (
                    <DraftActionCard
                      key={action.id}
                      action={action}
                      getDraft={getDraft}
                      onApprove={() => handleApprove(action.id)}
                      onReject={() => handleReject(action.id, true)}
                      onCopy={(_text, edited) => handleCopy(action.id, _text, edited)}
                    />
                  ) : (
                    <NonDraftActionCard
                      key={action.id}
                      action={action}
                      onApprove={() => handleApprove(action.id)}
                      onReject={() => handleReject(action.id, false)}
                    />
                  ),
                )
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              {history.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyTitle}>처리 내역이 없어요</Text>
                  <Text style={styles.emptyDesc}>승인하거나 거절한 AI 제안이 여기에 기록됩니다.</Text>
                </View>
              ) : (
                history.map((action) => <HistoryCard key={action.id} action={action} />)
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F5F3EF' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  backArrow: { fontSize: 18, color: '#374151' },
  title:     { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  subtitle:  { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  pendingBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  pendingBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  tabs: {
    flexDirection: 'row', paddingHorizontal: 20, marginBottom: 8, gap: 8,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  tabActive:      { backgroundColor: colors.primary },
  tabText:        { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive:  { color: '#fff' },

  scroll: { paddingHorizontal: 20 },

  empty: {
    backgroundColor: '#fff', borderRadius: 18, padding: 36,
    alignItems: 'center', marginTop: 16,
  },
  emptyIcon:  { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyDesc:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },

  // ── Card shared ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  actionIcon:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionIconText: { fontSize: 18 },
  cardTitle:      { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  cardBrand:      { fontSize: 12, color: '#9CA3AF' },
  confidenceBadge:{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  confidenceText: { fontSize: 11, fontWeight: '700' },

  // ── Draft input ─────────────────────────────────────────────────────────────
  draftLoading:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 },
  draftLoadingText: { fontSize: 13, color: '#9CA3AF' },
  draftInput: {
    backgroundColor: '#F9F8FF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E4FF',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1A1A2E', lineHeight: 22,
    minHeight: 120, textAlignVertical: 'top', marginBottom: 6,
  },
  editedHint: { fontSize: 11, color: colors.primary, marginBottom: 10 },

  detailBox: {
    backgroundColor: '#F9F8FF', borderRadius: 10, borderWidth: 1, borderColor: '#E8E4FF',
    padding: 12, marginBottom: 14,
  },
  detailText: { fontSize: 13, color: '#4B5563', lineHeight: 20 },

  // ── Card actions ─────────────────────────────────────────────────────────────
  cardActions:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  rejectBtnText:  { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  copyBtn: {
    flex: 2, paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#1A1A2E', alignItems: 'center',
  },
  copyBtnText:    { fontSize: 14, fontWeight: '700', color: '#fff' },
  approveBtn: {
    flex: 2, paddingVertical: 11, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // ── History card ──────────────────────────────────────────────────────────────
  historyCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  historyTitle:  { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 2 },
  historyBrand:  { fontSize: 11, color: '#9CA3AF' },
  historyRight:  { alignItems: 'flex-end', gap: 2 },
  historyStatus: { fontSize: 12, fontWeight: '700' },
  historyDate:   { fontSize: 11, color: '#9CA3AF' },
});
