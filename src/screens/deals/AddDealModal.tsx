import { Text } from '@/components/Text';
import React, { useState } from 'react';
import {
  Modal, View, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';
import PipelineStepper from '../../components/PipelineStepper';
import { PIPELINE_STAGES, STAGE_CONFIG } from '../../constants/dealStatus';

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDealModal({ visible, userId, onClose, onSuccess }: Props) {
  const [brand, setBrand]     = useState('');
  const [title, setTitle]     = useState('');
  const [amount, setAmount]   = useState('');
  const [status, setStatus]   = useState('inquiry');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);

  function reset() {
    setBrand(''); setTitle(''); setAmount('');
    setStatus('inquiry'); setDeadline(''); setError(''); setSaved(false);
  }

  async function handleSave() {
    if (!brand.trim()) { setError('브랜드명을 입력해주세요'); return; }
    if (!title.trim()) { setError('제목을 입력해주세요'); return; }
    setSaving(true);
    setError('');
    // PLAN_GATE: unlimited sponsorship workflows — free tier: check active (non-settled) deal count < 3 before insert
    const { data: newDeal, error: err } = await supabase.from('deals').insert({
      user_id: userId,
      brand: brand.trim(),
      title: title.trim(),
      amount: parseInt(amount.replace(/[^0-9]/g, '')) || 0,
      status: status as 'inquiry' | 'reviewing' | 'in_progress' | 'uploaded' | 'settled',
      end_date: deadline || null,
    }).select('id').single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    const hasDeadline = !!(deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline.trim()));
    if (hasDeadline) {
      await supabase.from('schedules').insert({
        user_id: userId,
        deal_id: newDeal?.id ?? null,
        title: `[${brand.trim()}] 협찬 마감`,
        type: 'deadline',
        schedule_date: deadline.trim(),
        start_time: new Date(`${deadline.trim()}T09:00:00`).toISOString(),
      });
    }
    setSaved(true);
    setTimeout(() => { reset(); onSuccess(); }, 1300);
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
            <Text style={styles.title}>새 협찬 추가</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
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

            <Text style={styles.fieldLabel}>협찬 현재 단계</Text>
            <PipelineStepper status={status} onChange={setStatus} />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { reset(); onClose(); }}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveText}>추가하기</Text>
                }
              </TouchableOpacity>
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
          {saved && (
            <View style={styles.successOverlay}>
              <View style={[styles.successBadge, { backgroundColor: STAGE_CONFIG[status]?.bg ?? '#EAE3FF' }]}>
                <Text style={[styles.successCheck, { color: STAGE_CONFIG[status]?.color ?? '#6E56F0' }]}>✓</Text>
              </View>
              <Text style={styles.successTitle}>파이프라인에 추가됐어요</Text>
              <Text style={styles.successBrand}>{brand}</Text>
              <View style={[styles.successStagePill, { backgroundColor: STAGE_CONFIG[status]?.bg ?? '#EAE3FF' }]}>
                <Text style={[styles.successStageText, { color: STAGE_CONFIG[status]?.color ?? '#6E56F0' }]}>
                  {PIPELINE_STAGES.find((s) => s.value === status)?.short}
                </Text>
              </View>
              {deadline !== '' && (
                <Text style={styles.successHint}>📅 마감 일정도 자동으로 추가됐어요</Text>
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
  sheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, maxHeight: '90%' },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:    { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  closeBtn: { fontSize: 18, color: '#9CA3AF', padding: 4 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#7C6FCD', marginBottom: 6 },
  input: {
    backgroundColor: '#F4F0FF', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#15131E',
  },
  error:   { fontSize: 13, color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  btnRow:  { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  saveBtn:   { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' },
  saveText:  { fontSize: 15, fontWeight: '800', color: '#fff' },
  successOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingHorizontal: 32,
  },
  successBadge:     { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  successCheck:     { fontSize: 30, fontWeight: '800' },
  successTitle:     { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  successBrand:     { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  successStagePill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  successStageText: { fontSize: 13, fontWeight: '700' },
  successHint:      { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});