import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ParsedDeal } from '../../utils/parseClipboard';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';

interface Props {
  visible: boolean;
  parsed: ParsedDeal;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClipboardParserModal({ visible, parsed, userId, onClose, onSuccess }: Props) {
  const [brand, setBrand] = useState(parsed.brand);
  const [title, setTitle] = useState(parsed.title);
  const [amount, setAmount] = useState(parsed.amount > 0 ? String(parsed.amount) : '');
  const [deadline, setDeadline] = useState(parsed.deadline);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // parsed가 바뀌면 (새로 파싱할 때) 필드 초기화
  React.useEffect(() => {
    setBrand(parsed.brand);
    setTitle(parsed.title);
    setAmount(parsed.amount > 0 ? String(parsed.amount) : '');
    setDeadline(parsed.deadline);
    setError('');
  }, [parsed]);

  async function handleSave() {
    if (!brand.trim()) { setError('브랜드명을 입력해주세요'); return; }
    if (!title.trim()) { setError('제목을 입력해주세요'); return; }

    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase.from('deals').insert({
        user_id: userId,
        brand: brand.trim(),
        title: title.trim(),
        amount: parseInt(amount.replace(/[^0-9]/g, '')) || 0,
        status: 'pending',
        end_date: deadline || null,
        source: 'clipboard',
      });
      if (err) throw err;
      if (deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
        await supabase.from('schedules').insert({
          user_id: userId,
          title: `[${brand.trim()}] 협찬 마감`,
          type: 'deadline',
          start_time: new Date(`${deadline.trim()}T09:00:00`).toISOString(),
        });
      }
      onSuccess();
    } catch (e: any) {
      setError(e.message ?? '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* 핸들 */}
          <View style={styles.handle} />

          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>협찬 문의 감지됨 📋</Text>
            <Text style={styles.headerSub}>내용을 확인하고 CRM에 추가하세요</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* 원문 미리보기 */}
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>복사한 원문</Text>
              <Text style={styles.previewText} numberOfLines={4}>{parsed.memo}</Text>
            </View>

            <View style={styles.divider} />

            {/* 추출된 정보 */}
            <Text style={styles.sectionTitle}>추출된 정보</Text>

            <Field label="브랜드명 *" value={brand} onChangeText={setBrand} placeholder="예: 삼성전자" />
            <Field label="제목 *" value={title} onChangeText={setTitle} placeholder="예: 갤럭시 리뷰 협찬" />
            <Field
              label="금액 (원)"
              value={amount}
              onChangeText={setAmount}
              placeholder="예: 3000000"
              keyboardType="numeric"
              hint={amount ? `${Number(amount.replace(/[^0-9]/g, '') || 0).toLocaleString('ko-KR')}원` : ''}
            />
            <Field
              label="마감일"
              value={deadline}
              onChangeText={setDeadline}
              placeholder="예: 2026-06-15"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* 버튼 */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>CRM에 추가</Text>
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

function Field({
  label, value, onChangeText, placeholder, keyboardType, hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  hint?: string;
}) {
  return (
    <View style={field.wrapper}>
      <Text style={field.label}>{label}</Text>
      <TextInput
        style={field.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C4C4C4"
        keyboardType={keyboardType ?? 'default'}
      />
      {hint ? <Text style={field.hint}>{hint}</Text> : null}
    </View>
  );
}

const field = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label:   { fontSize: 12, fontWeight: '600', color: '#7C6FCD', marginBottom: 6 },
  input:   {
    backgroundColor: '#F8F8FF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E4FF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
  },
  hint: { fontSize: 11, color: colors.primary, marginTop: 4, marginLeft: 4 },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 20,
  },
  header:     { marginBottom: 16 },
  headerTitle:{ fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  headerSub:  { fontSize: 13, color: '#7C6FCD', marginTop: 4 },
  preview: {
    backgroundColor: '#F8F8FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  previewLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 6 },
  previewText:  { fontSize: 13, color: '#4B5563', lineHeight: 20 },
  divider:     { height: 1, backgroundColor: '#F0EFFE', marginBottom: 16 },
  sectionTitle:{ fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  error:       { fontSize: 13, color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  btnRow:      { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn:   {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
