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
  defaultDate?: string; // 'YYYY-MM-DD'
  onClose: () => void;
  onSuccess: () => void;
}

const TYPE_OPTIONS = [
  { value: 'content',  label: '업로드 예정', bg: '#EDE9FE', color: '#6C63FF' },
  { value: 'deadline', label: '협찬 마감',   bg: '#FEF3C7', color: '#D97706' },
  { value: 'meeting',  label: '미팅',        bg: '#DBEAFE', color: '#2563EB' },
  { value: 'other',    label: '기타',        bg: '#D1FAE5', color: '#10B981' },
];

export default function AddScheduleModal({ visible, userId, defaultDate, onClose, onSuccess }: Props) {
  const [title, setTitle]   = useState('');
  const [type, setType]     = useState('content');
  const [date, setDate]     = useState(defaultDate ?? '');
  const [time, setTime]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function reset() {
    setTitle(''); setType('content');
    setDate(defaultDate ?? ''); setTime(''); setError('');
  }

  async function handleSave() {
    if (!title.trim()) { setError('제목을 입력해주세요'); return; }
    if (!date.trim()) { setError('날짜를 입력해주세요 (예: 2026-06-15)'); return; }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date.trim())) { setError('날짜 형식을 확인해주세요 (예: 2026-06-15)'); return; }

    const timeStr = time.trim() || '09:00';
    const startTime = `${date.trim()}T${timeStr}:00`;
    if (isNaN(Date.parse(startTime))) { setError('시간 형식을 확인해주세요 (예: 14:30)'); return; }

    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('schedules').insert({
      user_id: userId,
      title: title.trim(),
      type,
      start_time: new Date(startTime).toISOString(),
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
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
            <Text style={styles.title}>일정 추가</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>제목 *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="예: 갤럭시 리뷰 영상 업로드"
                placeholderTextColor="#C4C4C4"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>날짜 *</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="2026-06-15"
                  placeholderTextColor="#C4C4C4"
                />
              </View>
              <View style={[styles.fieldGroup, { width: 100 }]}>
                <Text style={styles.fieldLabel}>시간</Text>
                <TextInput
                  style={styles.input}
                  value={time}
                  onChangeText={setTime}
                  placeholder="14:30"
                  placeholderTextColor="#C4C4C4"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>유형</Text>
            <View style={styles.typeGrid}>
              {TYPE_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeBtn, { backgroundColor: t.bg }, type === t.value && styles.typeBtnActive]}
                  onPress={() => setType(t.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeBtnText, { color: t.color }, type === t.value && styles.typeBtnTextActive]}>
                    {t.label}
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
  row: { flexDirection: 'row', gap: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  typeBtnActive: { borderColor: colors.primary },
  typeBtnText: { fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { fontWeight: '800' },
  error:   { fontSize: 13, color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  btnRow:  { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  saveBtn:   { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' },
  saveText:  { fontSize: 15, fontWeight: '800', color: '#fff' },
});