import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MediaKitSlug'>;
};

const WEB_BASE_URL = 'https://manybe-web.vercel.app';
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

function validateSlug(slug: string): string | null {
  if (slug.length < 3) return '3자 이상 입력해주세요';
  if (slug.length > 30) return '30자 이하로 입력해주세요';
  if (!SLUG_REGEX.test(slug)) return '영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다';
  return null;
}

export default function MediaKitSlugScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [inquiryCopied, setInquiryCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchMediaKit();
  }, [user]);

  async function fetchMediaKit() {
    setLoading(true);
    const { data } = await supabase
      .from('media_kits')
      .select('slug')
      .eq('user_id', user!.id)
      .limit(1);

    const existing = data?.[0];
    if (existing?.slug) {
      setSlug(existing.slug);
      setOriginalSlug(existing.slug);
    }
    setLoading(false);
  }

  function handleSlugChange(text: string) {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(cleaned);
    setSlugAvailable(null);
    setSlugError('');
  }

  async function checkSlugAvailable() {
    const error = validateSlug(slug);
    if (error) { setSlugError(error); return; }
    if (slug === originalSlug) { setSlugAvailable(true); return; }

    setCheckingSlug(true);
    const { data } = await supabase
      .from('media_kits')
      .select('id')
      .eq('slug', slug)
      .limit(1);

    setCheckingSlug(false);
    setSlugAvailable(!data || data.length === 0);
    if (data && data.length > 0) setSlugError('이미 사용 중인 주소입니다');
  }

  async function handleSave() {
    const error = validateSlug(slug);
    if (error) { setSlugError(error); return; }
    if (slugAvailable === false) return;

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('media_kits')
        .select('id')
        .eq('user_id', user!.id)
        .limit(1);

      if (existing && existing.length > 0) {
        const { error: err } = await supabase
          .from('media_kits')
          .update({ slug })
          .eq('user_id', user!.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('media_kits')
          .insert({ user_id: user!.id, slug });
        if (err) throw err;
      }

      setOriginalSlug(slug);
      Alert.alert('저장 완료', `미디어 키트 주소가 설정됐습니다.\n${WEB_BASE_URL}/${slug}`);
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    if (!originalSlug) return;
    Clipboard.setStringAsync(`${WEB_BASE_URL}/${originalSlug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyInquiry() {
    if (!originalSlug) return;
    Clipboard.setStringAsync(`${WEB_BASE_URL}/${originalSlug}/inquiry`);
    setInquiryCopied(true);
    setTimeout(() => setInquiryCopied(false), 2000);
  }

  const publicUrl = `${WEB_BASE_URL}/${slug || '나의-slug'}`;
  const hasChanges = slug !== originalSlug;
  const validationError = validateSlug(slug);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>미디어 키트 URL</Text>
          <Text style={styles.subtitle}>나만의 협찬 제안 페이지 주소</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* 설명 카드 */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📎 미디어 키트란?</Text>
            <Text style={styles.infoText}>
              브랜드에게 보내는 나의 채널 소개 페이지예요.{'\n'}
              주소를 공유하면 브랜드가 단가·채널 현황을 확인하고 협찬 문의를 넣을 수 있어요.
            </Text>
          </View>

          {/* URL 설정 카드 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>주소 설정</Text>

            <Text style={styles.fieldLabel}>나의 URL 주소</Text>
            <View style={[
              styles.inputRow,
              slugError ? styles.inputError : null,
              slugAvailable === true && !hasChanges ? styles.inputSuccess : null,
            ]}>
              <Text style={styles.inputPrefix}>manybe-web.vercel.app/</Text>
              <TextInput
                style={styles.input}
                value={slug}
                onChangeText={handleSlugChange}
                onBlur={slug.length >= 3 ? checkSlugAvailable : undefined}
                placeholder="나의-채널명"
                placeholderTextColor="#C4C4C4"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {checkingSlug && <ActivityIndicator size="small" color={colors.primary} />}
              {!checkingSlug && slugAvailable === true && (
                <Text style={styles.checkIcon}>✓</Text>
              )}
            </View>

            {slugError ? (
              <Text style={styles.errorText}>⚠ {slugError}</Text>
            ) : slugAvailable === true && hasChanges ? (
              <Text style={styles.successText}>✓ 사용 가능한 주소입니다</Text>
            ) : (
              <Text style={styles.hintText}>영문 소문자·숫자·하이픈(-) 사용 가능 · 3~30자</Text>
            )}

            {/* 미리보기 */}
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>미리보기</Text>
              <Text style={styles.previewUrl} numberOfLines={1}>{publicUrl}</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (saving || !!validationError) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || !!validationError}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>저장하기</Text>
              }
            </TouchableOpacity>
          </View>

          {/* 공유 카드 — slug 있을 때만 표시 */}
          {originalSlug ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>공유하기</Text>
              <View style={styles.urlBox}>
                <Text style={styles.urlText} numberOfLines={1}>
                  {WEB_BASE_URL}/{originalSlug}
                </Text>
              </View>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
                  <Text style={styles.copyBtnText}>{copied ? '✓ 복사됨' : '🔗 URL 복사'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inquiryBtn}
                  onPress={handleCopyInquiry}
                  activeOpacity={0.8}
                >
                  <Text style={styles.inquiryBtnText}>{inquiryCopied ? '✓ 복사됨' : '📬 문의 폼 복사'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  backArrow: { fontSize: 18, color: '#374151' },
  title:    { fontSize: 20, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.4 },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20 },

  infoCard: {
    backgroundColor: '#F0EFFE', borderRadius: 16, padding: 16, marginBottom: 16,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  infoText:  { fontSize: 13, color: '#4B5563', lineHeight: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#7C6FCD', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E8E4FF', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#F8F8FF',
  },
  inputError:   { borderColor: '#EF4444' },
  inputSuccess: { borderColor: '#10B981' },
  inputPrefix: { fontSize: 12, color: '#9CA3AF', marginRight: 2, flexShrink: 0 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  checkIcon: { fontSize: 16, color: '#10B981', fontWeight: '700' },

  errorText:   { fontSize: 12, color: '#EF4444', marginTop: 6, marginLeft: 2 },
  successText: { fontSize: 12, color: '#10B981', marginTop: 6, marginLeft: 2 },
  hintText:    { fontSize: 11, color: '#9CA3AF', marginTop: 6, marginLeft: 2 },

  previewBox: {
    backgroundColor: '#F8F8FF', borderRadius: 10, padding: 12,
    marginTop: 16, marginBottom: 4,
  },
  previewLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', marginBottom: 4 },
  previewUrl:   { fontSize: 13, color: colors.primary, fontWeight: '600' },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  urlBox: {
    backgroundColor: '#F8F8FF', borderRadius: 10, padding: 12, marginBottom: 14,
  },
  urlText: { fontSize: 13, color: '#374151', fontWeight: '500' },

  btnRow: { flexDirection: 'row', gap: 10 },
  copyBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F0EFFE', alignItems: 'center',
  },
  copyBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  inquiryBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#1A1A2E', alignItems: 'center',
  },
  inquiryBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});