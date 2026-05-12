import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: 'pending',     label: '검토중',   bg: '#F3F4F6', color: '#4B5563' },
  { value: 'in_progress', label: '협상중',   bg: '#FEF3C7', color: '#D97706' },
  { value: 'completed',   label: '계약완료', bg: '#D1FAE5', color: '#059669' },
];

export default function AddDealModal({ visible, userId, onClose, onSuccess }: Props) {
  const [brand, setBrand]     = useState('');
  const [title, setTitle]     = useState('');
  const [amount, setAmount]   = useState('');
  const [status, setStatus]   = useState('pending');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  function reset() {
    setBrand(''); setTitle(''); setAmount('');
    setStatus('pending'); setDeadline(''); setError('');
  }

  async function handleSave() {
    if (!brand.trim()) { setError('브랜드명을 입력해주세요'); return; }
    if (!title.trim()) { setError('제목을 입력해주세요'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('deals').insert({
      user_id: userId,
      brand: brand.trim(),
      title: title.trim(),
      amount: parseInt(amount.replace(/[^0-9]/g, '')) || 0,
      status,
      end_date: deadline || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
      await supabase.from('schedules').insert({
        user_id: userId,
        title: `[${brand.trim()}] 협찬 마감`,
        type: 'deadline',
        start_time: new Date(`${deadline.trim()}T09:00:00`).toISOString(),
      });
    }
    reset();
    onSuccess();
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

            {/* 상태 선택 */}
            <Text style={styles.fieldLabel}>상태</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.statusBtn, { backgroundColor: s.bg }, status === s.value && styles.statusBtnActive]}
                  onPress={() => setStatus(s.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statusBtnText, { color: s.color }, status === s.value && styles.statusBtnTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
    backgroundColor: '#F8F8FF', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1A1A2E',
  },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  statusBtnActive: { borderColor: colors.primary },
  statusBtnText: { fontSize: 13, fontWeight: '600' },
  statusBtnTextActive: { fontWeight: '800' },
  error:   { fontSize: 13, color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  btnRow:  { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  saveBtn:   { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' },
  saveText:  { fontSize: 15, fontWeight: '800', color: '#fff' },
});