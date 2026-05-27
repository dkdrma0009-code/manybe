import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';
import { tokens } from '../../constants/tokens';

interface Props {
  userId: string;
  onComplete: () => void;
}

type BizStatus = 'idle' | 'checking' | 'valid' | 'invalid';

function formatBizNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function isValidBizNumber(formatted: string): boolean {
  return formatted.replace(/\D/g, '').length === 10;
}

export default function AdvertiserOnboardingScreen({ userId, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [companyName, setCompanyName]   = useState('');
  const [bizNumber, setBizNumber]       = useState('');
  const [bizStatus, setBizStatus]       = useState<BizStatus>('idle');
  const [bizMessage, setBizMessage]     = useState('');
  const [loading, setLoading]           = useState(false);

  const canVerify  = isValidBizNumber(bizNumber) && bizStatus !== 'checking';
  const canSubmit  = companyName.trim().length > 0 && bizStatus === 'valid' && !loading;

  async function handleVerify() {
    if (!canVerify) return;
    setBizStatus('checking');
    setBizMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('validate-business-number', {
        body: { b_no: bizNumber.replace(/\D/g, '') },
      });

      if (error) throw error;

      if (data?.valid) {
        setBizStatus('valid');
        setBizMessage(data.message ?? '정상 사업자입니다.');
      } else {
        setBizStatus('invalid');
        setBizMessage(data?.message ?? '유효하지 않은 사업자등록번호입니다.');
      }
    } catch {
      // 검증 서비스 장애 시 사용자가 직접 진행할 수 있도록
      setBizStatus('invalid');
      setBizMessage('검증 서비스에 일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        role: 'advertiser',
        full_name: companyName.trim(),
        company_name: companyName.trim(),
        business_number: bizNumber.replace(/\D/g, ''),
        advertiser_onboarding_done: true,
      });
      if (error) throw error;
      await AsyncStorage.setItem('advertiser_onboarding_done', 'true');
      onComplete();
    } catch {
      Alert.alert('오류', '저장 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  function handleBizNumberChange(t: string) {
    setBizNumber(formatBizNumber(t));
    // 번호가 바뀌면 검증 상태 초기화
    if (bizStatus !== 'idle') {
      setBizStatus('idle');
      setBizMessage('');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Text style={s.emoji}>📢</Text>
          <Text style={s.title}>브랜드 정보를 입력해주세요</Text>
          <Text style={s.subtitle}>검증된 광고주에게만 크리에이터 연결이 가능합니다</Text>
        </View>

        <View style={s.form}>
          <View style={s.fieldGroup}>
            <Text style={s.label}>회사명 / 브랜드명</Text>
            <TextInput
              style={s.input}
              placeholder="예) 매니비 주식회사"
              placeholderTextColor={colors.textTertiary}
              value={companyName}
              onChangeText={setCompanyName}
              returnKeyType="next"
              autoCapitalize="none"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>사업자등록번호</Text>
            <View style={s.bizRow}>
              <TextInput
                style={[s.input, s.bizInput]}
                placeholder="000-00-00000"
                placeholderTextColor={colors.textTertiary}
                value={bizNumber}
                onChangeText={handleBizNumberChange}
                keyboardType="numeric"
                maxLength={12}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[s.verifyBtn, !canVerify && s.verifyBtnDisabled]}
                onPress={handleVerify}
                disabled={!canVerify}
                activeOpacity={0.85}
              >
                {bizStatus === 'checking'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.verifyBtnText}>확인</Text>
                }
              </TouchableOpacity>
            </View>

            {/* 검증 결과 */}
            {bizStatus === 'valid' && (
              <View style={s.statusRow}>
                <Text style={s.statusIcon}>✅</Text>
                <Text style={s.statusValid}>{bizMessage}</Text>
              </View>
            )}
            {bizStatus === 'invalid' && (
              <View style={s.statusRow}>
                <Text style={s.statusIcon}>❌</Text>
                <Text style={s.statusInvalid}>{bizMessage}</Text>
              </View>
            )}
            {bizStatus === 'idle' && (
              <Text style={s.hint}>사업자등록번호 10자리 입력 후 확인을 눌러주세요</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[s.button, !canSubmit && s.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.buttonText}>완료</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji:    { fontSize: 48, marginBottom: 16 },
  title:    { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  form: { flex: 1, gap: 24 },
  fieldGroup: { gap: 8 },
  label:  { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
  },

  bizRow:   { flexDirection: 'row', gap: 10, alignItems: 'center' },
  bizInput: { flex: 1 },
  verifyBtn: {
    backgroundColor: tokens.action,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  verifyBtnDisabled: { backgroundColor: colors.border },
  verifyBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusIcon:    { fontSize: 13 },
  statusValid:   { fontSize: 13, color: tokens.success, fontWeight: '600' },
  statusInvalid: { fontSize: 13, color: tokens.error, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.textTertiary, marginTop: 4 },

  button: {
    backgroundColor: tokens.action,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  buttonDisabled: { backgroundColor: colors.border },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
