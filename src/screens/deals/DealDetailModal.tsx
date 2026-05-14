import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';
import PipelineStepper from '../../components/PipelineStepper';
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
}

interface Props {
  visible: boolean;
  deal: DealDetailData;
  onClose: () => void;
  onSuccess: () => void;
}

// PLAN_GATE: settlement management — uploaded→settled transition and settlement tracking

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

export default function DealDetailModal({ visible, deal, onClose, onSuccess }: Props) {
  const [brand, setBrand]     = useState(deal.brand);
  const [title, setTitle]     = useState(deal.title);
  const [amount, setAmount]   = useState(formatAmount(deal.amount));
  const originalStatus = STATUS_LABEL_TO_VALUE[deal.status] ?? deal.status ?? 'reviewing';
  const [status, setStatus]   = useState(originalStatus);
  const [deadline, setDeadline] = useState(rawToDisplay(deal.endDate));
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]     = useState('');

  const isAdvancing = (STAGE_INDEX[status] ?? 0) > (STAGE_INDEX[originalStatus] ?? 0);
  const saveBtnLabel = isAdvancing ? (ADVANCE_CTA[status] ?? '저장하기') : '저장하기';
  const [savedStage, setSavedStage] = useState<string | null>(null);

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
      amount: parseInt(amount.replace(/[^0-9]/g, '')) || 0,
      status,
      end_date: deadline || null,
    }).eq('id', deal.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    const deadlineChanged = deadline !== rawToDisplay(deal.endDate);
    if (deadlineChanged && deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('schedules').insert({
          user_id: userData.user.id,
          title: `[${brand.trim()}] 협찬 마감`,
          type: 'deadline',
          start_time: new Date(`${deadline.trim()}T09:00:00`).toISOString(),
        });
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

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
            {savedStage === 'settled' && (
              <Text style={styles.successHint}>수익 탭에서 정산금액을 기록해두세요</Text>
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
  header:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  avatar:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  headerSub:   { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  closeBtn: { fontSize: 18, color: '#9CA3AF', padding: 4 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#7C6FCD', marginBottom: 6 },
  input: {
    backgroundColor: '#F4F0FF', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#15131E',
  },
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
  successHint:      { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginTop: 4 },
  error:   { fontSize: 13, color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  btnRow:  { flexDirection: 'row', gap: 10, marginTop: 8 },
  deleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center' },
  deleteText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  saveBtn:   { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' },
  saveText:  { fontSize: 15, fontWeight: '800', color: '#fff' },
});