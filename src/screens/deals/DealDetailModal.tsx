import { Text } from '@/components/Text';
import React, { useState } from 'react';
import {
  Modal, View, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';
import PipelineStepper from '../../components/PipelineStepper';
import { BrandHistoryCard } from '../../components/BrandHistoryCard';
import { DealHealthBadge } from '../../components/DealHealthBadge';
import { computeDealHealth } from '../../utils/dealHealth';
import { useBrandHistory } from '../../hooks/useBrandHistory';
import {
  PIPELINE_STAGES, STAGE_INDEX, STAGE_CONFIG,
  ADVANCE_CTA, SUCCESS_MESSAGES,
} from '../../constants/dealStatus';

export interface DealDetailData {
  id: string;
  brand: string;
  title: string;
  amount: number;
  endDate: string;
  status: string;
  avatarColor: string;
  createdAt: string;
}

interface Props {
  visible: boolean;
  deal: DealDetailData;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateRevenue?: () => void;
  userId?: string;
  onNavigateBrand?: (brand: string) => void;
}

const STATUS_LABEL_TO_VALUE: Record<string, string> = {
  '문의': 'inquiry', '검토중': 'reviewing', '진행중': 'in_progress',
  '업로드됨': 'uploaded', '정산완료': 'settled',
};

function formatAmount(n: number) {
  return n === 0 ? '' : n.toLocaleString('ko-KR');
}

function rawToDisplay(isoOrEmpty: string) {
  if (!isoOrEmpty) return '';
  const d = new Date(isoOrEmpty);
  if (isNaN(d.getTime())) return isoOrEmpty;
  return d.toISOString().slice(0, 10);
}

export default function DealDetailModal({ visible, deal, onClose, onSuccess, onNavigateRevenue, userId, onNavigateBrand }: Props) {
  const [brand, setBrand]       = useState(deal.brand);
  const [title, setTitle]       = useState(deal.title);
  const [amount, setAmount]     = useState(formatAmount(deal.amount));
  const originalStatus = STATUS_LABEL_TO_VALUE[deal.status] ?? deal.status ?? 'reviewing';
  const [status, setStatus]     = useState(originalStatus);
  const [deadline, setDeadline] = useState(rawToDisplay(deal.endDate));
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState('');
  const [savedStage, setSavedStage] = useState<string | null>(null);

  const isAdvancing = (STAGE_INDEX[status] ?? 0) > (STAGE_INDEX[originalStatus] ?? 0);
  const saveBtnLabel = isAdvancing ? (ADVANCE_CTA[status] ?? '저장하기') : '저장하기';

  const { stats: brandStats } = useBrandHistory(userId, deal.brand);
  const health = computeDealHealth(
    { status: originalStatus, endDate: deal.endDate || null, amount: deal.amount, createdAt: deal.createdAt },
    brandStats,
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = !!deadline && deadline < todayStr && originalStatus !== 'settled';
  const showSettlement = originalStatus === 'uploaded' || originalStatus === 'settled';
  const rawAmount = parseInt(amount.replace(/[^0-9]/g, '')) || 0;
  const taxAmt = Math.round(rawAmount * 0.033);
  const netAmt = rawAmount - taxAmt;

  function handleDelete() {
    Alert.alert('협찬 삭제', `"${deal.brand}" 협찬을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const { error: err } = await supabase.from('deals').delete().eq('id', deal.id);
          setDeleting(false);
          if (err) { setError(err.message); return; }
          onSuccess();
        },
      },
    ]);
  }

  async function handleSave() {
    if (!brand.trim()) { setError('브랜드명을 입력해주세요'); return; }
    if (!title.trim()) { setError('제목을 입력해주세요'); return; }
    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('deals').update({
      brand: brand.trim(),
      title: title.trim(),
      amount: rawAmount,
      status,
      end_date: deadline || null,
    }).eq('id', deal.id);

    setSaving(false);
    if (err) { setError(err.message); return; }

    // Get user once for all schedule operations
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;

    if (uid) {
      // Create deadline schedule if end_date changed
      const deadlineChanged = deadline !== rawToDisplay(deal.endDate);
      if (deadlineChanged && deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
        // 기존 마감 일정을 교체 — 수정할 때마다 중복 생성되던 문제 방지
        await supabase.from('schedules').delete()
          .eq('deal_id', deal.id)
          .eq('type', 'deadline');
        await supabase.from('schedules').insert({
          user_id: uid,
          deal_id: deal.id,
          title: `[${brand.trim()}] 협찬 마감`,
          type: 'deadline',
          start_time: new Date(`${deadline.trim()}T09:00:00`).toISOString(),
        });
      }

      // Auto-create workflow milestone schedule on stage advance
      if (isAdvancing) {
        const nowISO = new Date().toISOString();
        if (status === 'in_progress') {
          await supabase.from('schedules').insert({
            user_id: uid,
            deal_id: deal.id,
            title: `[${brand.trim()}] 콘텐츠 제작 시작`,
            type: 'content',
            start_time: nowISO,
          });
        } else if (status === 'uploaded') {
          await supabase.from('schedules').insert({
            user_id: uid,
            deal_id: deal.id,
            title: `[${brand.trim()}] 콘텐츠 업로드 완료`,
            type: 'content',
            start_time: nowISO,
          });
        } else if (status === 'settled') {
          await supabase.from('schedules').insert({
            user_id: uid,
            deal_id: deal.id,
            title: `[${brand.trim()}] 정산 완료`,
            type: 'other',
            start_time: nowISO,
          });

          // 하이라이트 추가 제안 (수익 기록 확인 뒤에 표시)
          const showHighlightPrompt = () => {
            Alert.alert(
              '🎉 정산 완료!',
              `${brand.trim()} 협업을 미디어 키트 하이라이트에 추가할까요?\n수치는 나중에 편집할 수 있어요.`,
              [
                { text: '나중에', style: 'cancel' },
                {
                  text: '추가하기',
                  onPress: async () => {
                    const { data: kit } = await supabase
                      .from('media_kits')
                      .select('highlights')
                      .eq('user_id', uid)
                      .single();
                    const current = (kit?.highlights ?? []) as any[];
                    const SECTION_ID = 'collab_auto';
                    const newItem = { label: brand.trim(), value: '성과 기록 필요', note: '미디어 키트 편집에서 수치를 입력해주세요' };
                    const exists = current.find((s: any) => s.id === SECTION_ID);
                    const updated = exists
                      ? current.map((s: any) => s.id === SECTION_ID ? { ...s, items: [...s.items, newItem] } : s)
                      : [...current, { id: SECTION_ID, title: '🤝 브랜드 협업 성과', items: [newItem] }];
                    await supabase.from('media_kits').update({ highlights: updated }).eq('user_id', uid);
                    Alert.alert('추가됐어요', '미디어 키트 편집에서 수치를 입력해주세요.');
                  },
                },
              ],
            );
          };

          // 정산 금액을 수익 현황에 기록할지 확인 — 이중 입력 제거
          if (rawAmount > 0) {
            setTimeout(() => {
              Alert.alert(
                '수익으로 기록할까요?',
                `${brand.trim()} 협찬 ${rawAmount.toLocaleString('ko-KR')}원을 수익 현황에 추가합니다.`,
                [
                  { text: '기록 안 함', style: 'cancel', onPress: showHighlightPrompt },
                  {
                    text: '기록하기',
                    onPress: async () => {
                      await supabase.from('revenues').insert({
                        user_id: uid,
                        amount: rawAmount,
                        category: 'sponsorship',
                        description: `${brand.trim()} 협찬 정산`,
                        date: new Date().toISOString().slice(0, 10),
                      });
                      showHighlightPrompt();
                    },
                  },
                ],
              );
            }, 600);
          } else {
            setTimeout(showHighlightPrompt, 1500);
          }
        }
      }
    }

    if (isAdvancing) {
      setSavedStage(status);
      setTimeout(() => { setSavedStage(null); onSuccess(); }, 1400);
    } else {
      onSuccess();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: deal.avatarColor }]}>
              <Text style={styles.avatarText}>{deal.brand[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{deal.brand}</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{deal.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Health badge */}
          {originalStatus !== 'settled' && (
            <View style={styles.healthRow}>
              <DealHealthBadge health={health} showInsights={health.insights.length > 0} />
            </View>
          )}

          {/* Overdue warning */}
          {isOverdue && (
            <View style={styles.overdueBanner}>
              <Text style={styles.overdueIcon}>⚠</Text>
              <Text style={styles.overdueText}>마감일이 지났어요 · 진행 단계를 업데이트하거나 일정을 조정하세요</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <BrandHistoryCard
              userId={userId}
              brand={deal.brand}
              onViewAll={onNavigateBrand ? () => { onClose(); onNavigateBrand(deal.brand); } : undefined}
            />
            <Field label="브랜드명 *" value={brand} onChangeText={setBrand} placeholder="예: 삼성전자" />
            <Field label="제목 *" value={title} onChangeText={setTitle} placeholder="예: 갤럭시 리뷰 협찬" />
            <Field
              label="금액 (원)"
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
              placeholder="0"
              keyboardType="numeric"
            />
            <Field label="마감일" value={deadline} onChangeText={setDeadline} placeholder="예: 2026-06-15" />

            <Text style={styles.fieldLabel}>협찬 진행 단계</Text>
            <PipelineStepper status={status} onChange={setStatus} />

            {/* Settlement section — shown when deal is uploaded or settled */}
            {showSettlement && rawAmount > 0 && (
              <View style={styles.settlementCard}>
                <Text style={styles.settlementTitle}>정산 예상</Text>
                <View style={styles.settlementRow}>
                  <Text style={styles.settlementLabel}>정산 금액</Text>
                  <Text style={styles.settlementValue}>{rawAmount.toLocaleString('ko-KR')}원</Text>
                </View>
                <View style={styles.settlementRow}>
                  <Text style={styles.settlementLabel}>세금 공제 (3.3%)</Text>
                  <Text style={styles.settlementTax}>−{taxAmt.toLocaleString('ko-KR')}원</Text>
                </View>
                <View style={[styles.settlementRow, styles.settlementNetRow]}>
                  <Text style={styles.settlementNetLabel}>실수령 예상</Text>
                  <Text style={styles.settlementNet}>{netAmt.toLocaleString('ko-KR')}원</Text>
                </View>
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.deleteBtn, (deleting || saving) && { opacity: 0.6 }]}
                onPress={handleDelete}
                disabled={deleting || saving}
              >
                {deleting
                  ? <ActivityIndicator color="#EF4444" size="small" />
                  : <Text style={styles.deleteText}>삭제</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving || deleting}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveText}>{saveBtnLabel}</Text>
                }
              </TouchableOpacity>
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>

          {savedStage && (
            <View style={styles.successOverlay}>
              <View style={[styles.successBadge, { backgroundColor: STAGE_CONFIG[savedStage]?.bg ?? '#F3F4F6' }]}>
                <Text style={[styles.successCheck, { color: STAGE_CONFIG[savedStage]?.color ?? '#6B7280' }]}>✓</Text>
              </View>
              <Text style={styles.successTitle}>{SUCCESS_MESSAGES[savedStage] ?? '저장됐어요'}</Text>
              <View style={[styles.successStagePill, { backgroundColor: STAGE_CONFIG[savedStage]?.bg ?? '#F3F4F6' }]}>
                <Text style={[styles.successStageText, { color: STAGE_CONFIG[savedStage]?.color ?? '#6B7280' }]}>
                  {PIPELINE_STAGES.find((s) => s.value === savedStage)?.short}
                </Text>
              </View>
              {savedStage === 'settled' ? (
                <>
                  <Text style={styles.successHint}>수익 탭에서 정산금액을 기록해두세요</Text>
                  {onNavigateRevenue && (
                    <TouchableOpacity
                      style={styles.revenueBtn}
                      onPress={() => { setSavedStage(null); onSuccess(); onNavigateRevenue(); }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.revenueBtnText}>수익 기록하기 →</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={styles.successHint}>캘린더에 자동으로 일정이 추가됐어요</Text>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C4C4C4"
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, maxHeight: '92%' },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  avatar:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  headerSub:   { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  closeBtn: { fontSize: 18, color: '#9CA3AF', padding: 4 },

  overdueBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FBE5E5', borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  overdueIcon: { fontSize: 14 },
  overdueText: { fontSize: 12, fontWeight: '600', color: '#C13C3C', flex: 1, lineHeight: 18 },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#7C6FCD', marginBottom: 6 },
  input: {
    backgroundColor: '#F4F0FF', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#15131E',
  },

  settlementCard: {
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#BBF7D0', gap: 8,
  },
  settlementTitle: { fontSize: 11, fontWeight: '700', color: '#2E8C5D', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  settlementRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settlementLabel: { fontSize: 13, color: '#4B5563' },
  settlementValue: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  settlementTax:   { fontSize: 13, fontWeight: '600', color: '#C13C3C' },
  settlementNetRow:   { borderTopWidth: 1, borderTopColor: '#BBF7D0', paddingTop: 8, marginTop: 2 },
  settlementNetLabel: { fontSize: 14, fontWeight: '700', color: '#2E8C5D' },
  settlementNet:      { fontSize: 16, fontWeight: '800', color: '#2E8C5D' },

  successOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    alignItems: 'center', justifyContent: 'center', gap: 14,
    paddingHorizontal: 32,
  },
  successBadge:     { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  successCheck:     { fontSize: 36, fontWeight: '800' },
  successTitle:     { fontSize: 22, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' },
  successStagePill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  successStageText: { fontSize: 14, fontWeight: '700' },
  successHint:      { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  revenueBtn: {
    backgroundColor: '#2E8C5D', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 13, marginTop: 4,
  },
  revenueBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  healthRow: { marginBottom: 12 },
  error:   { fontSize: 13, color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  btnRow:  { flexDirection: 'row', gap: 10, marginTop: 8 },
  deleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center' },
  deleteText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  saveBtn:   { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' },
  saveText:  { fontSize: 15, fontWeight: '800', color: '#fff' },
});
