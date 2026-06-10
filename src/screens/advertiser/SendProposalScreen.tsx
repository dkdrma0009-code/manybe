import { Text } from '@/components/Text';
import React, { useState } from 'react';
import {
  View, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdvertiserRootStackParamList } from '../../navigation/AdvertiserNavigator';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { tokens } from '../../constants/tokens';

type Nav   = NativeStackNavigationProp<AdvertiserRootStackParamList>;
type Route = RouteProp<AdvertiserRootStackParamList, 'SendProposal'>;

export default function SendProposalScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { user } = useAuth();

  const [brandName, setBrandName] = useState('');
  const [message, setMessage]     = useState('');
  const [amount, setAmount]        = useState('');
  const [loading, setLoading]      = useState(false);

  const canSubmit = brandName.trim().length > 0 && message.trim().length > 10;

  async function handleSend() {
    if (!canSubmit || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('advertiser_proposals').insert({
        creator_id:  params.creatorId,
        advertiser_id: user.id,
        brand_name:  brandName.trim(),
        message:     message.trim(),
        amount:      amount ? parseInt(amount.replace(/\D/g, ''), 10) : 0,
      });
      if (error) throw error;
      Alert.alert('전송 완료', `${params.creatorName}님께 제안을 보냈습니다.`, [
        { text: '확인', onPress: () => navigation.navigate('MyProposals') },
      ]);
    } catch {
      Alert.alert('오류', '제안 전송 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.title}>협찬 제안</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.targetBadge}>
          <Text style={s.targetLabel}>수신자</Text>
          <Text style={s.targetName}>{params.creatorName || '크리에이터'}</Text>
        </View>

        <View style={s.form}>
          <View style={s.fieldGroup}>
            <Text style={s.label}>브랜드명 *</Text>
            <TextInput
              style={s.input}
              placeholder="예) 매니비 코리아"
              placeholderTextColor={colors.textTertiary}
              value={brandName}
              onChangeText={setBrandName}
              returnKeyType="next"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>협찬 금액 (선택)</Text>
            <TextInput
              style={s.input}
              placeholder="예) 500000"
              placeholderTextColor={colors.textTertiary}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/\D/g, ''))}
              keyboardType="numeric"
              returnKeyType="next"
            />
            {amount ? (
              <Text style={s.amountPreview}>
                {Number(amount).toLocaleString('ko-KR')}원
              </Text>
            ) : null}
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>제안 메시지 *</Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder={'협찬 내용, 기간, 조건 등을 자세히 적어주세요\n(최소 10자 이상)'}
              placeholderTextColor={colors.textTertiary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={s.charCount}>{message.length}자</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.sendBtn, !canSubmit && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!canSubmit || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.sendBtnText}>제안 보내기</Text>
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
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: colors.text, lineHeight: 32 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.actionSoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 24,
    gap: 8,
  },
  targetLabel: { fontSize: 13, color: tokens.actionDeep },
  targetName: { fontSize: 14, fontWeight: '700', color: tokens.action },
  form: { gap: 20 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
  },
  textarea: {
    height: 140,
    paddingTop: 14,
  },
  amountPreview: {
    fontSize: 13,
    color: tokens.action,
    fontWeight: '600',
    marginTop: 2,
  },
  charCount: { fontSize: 12, color: colors.textTertiary, textAlign: 'right' },
  sendBtn: {
    backgroundColor: tokens.action,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
