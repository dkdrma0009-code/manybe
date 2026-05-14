import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MediaKitEdit'>;
};

const PRICING_KEYS = [
  { key: 'short_form',  label: '숏폼 (60초 이하)' },
  { key: 'long_form',   label: '롱폼 (10분 이상)' },
  { key: 'story',       label: '스토리 / 릴스' },
  { key: 'mention',     label: '제품 언급' },
  { key: 'dedicated',   label: '전체 광고 영상' },
] as const;

type PricingKey = typeof PRICING_KEYS[number]['key'];

export default function MediaKitEditScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // fields
  const [bio, setBio] = useState('');
  const [pricing, setPricing] = useState<Partial<Record<PricingKey, string>>>({});
  const [pastBrands, setPastBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState('');
  const [isFormEnabled, setIsFormEnabled] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadMediaKit();
  }, [user]);

  async function loadMediaKit() {
    setLoading(true);
    const { data } = await supabase
      .from('media_kits')
      .select('bio, pricing, past_brands, is_form_enabled')
      .eq('user_id', user!.id)
      .limit(1);

    const kit = data?.[0];
    if (kit) {
      setBio(kit.bio ?? '');
      const p: Partial<Record<PricingKey, string>> = {};
      for (const { key } of PRICING_KEYS) {
        const val = kit.pricing?.[key];
        if (val != null) p[key] = String(val);
      }
      setPricing(p);
      setPastBrands(kit.past_brands ?? []);
      setIsFormEnabled(kit.is_form_enabled ?? false);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const pricingObj: Record<string, number> = {};
      for (const { key } of PRICING_KEYS) {
        const val = pricing[key];
        if (val && val.trim() !== '') {
          const num = parseInt(val.replace(/,/g, ''), 10);
          if (!isNaN(num)) pricingObj[key] = num;
        }
      }

      const { error } = await supabase
        .from('media_kits')
        .update({
          bio: bio.trim() || null,
          pricing: Object.keys(pricingObj).length > 0 ? pricingObj : null,
          past_brands: pastBrands.length > 0 ? pastBrands : null,
          // PLAN_GATE: unlimited inquiry reception — consider capping monthly inbound inquiry count for free tier
          is_form_enabled: isFormEnabled,
        })
        .eq('user_id', user!.id);

      if (error) throw error;
      Alert.alert('저장 완료', '미디어 키트가 업데이트됐습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function addBrand() {
    const trimmed = brandInput.trim();
    if (!trimmed || pastBrands.includes(trimmed)) {
      setBrandInput('');
      return;
    }
    setPastBrands((prev) => [...prev, trimmed]);
    setBrandInput('');
  }

  function removeBrand(brand: string) {
    setPastBrands((prev) => prev.filter((b) => b !== brand));
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>미디어 키트 편집</Text>
          <Text style={styles.subtitle}>브랜드에게 보여지는 내용</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>저장</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* 자기소개 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>자기소개</Text>
            <Text style={styles.sectionDesc}>브랜드가 가장 먼저 보는 문구예요</Text>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder="예: 뷰티·라이프스타일 크리에이터 | 구독자 10만 | 진정성 있는 리뷰로 소통합니다"
              placeholderTextColor="#C4C4C4"
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length} / 200</Text>
          </View>

          {/* 광고 단가 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>광고 단가</Text>
            <Text style={styles.sectionDesc}>입력하지 않은 항목은 미디어 키트에 표시되지 않아요</Text>
            {PRICING_KEYS.map(({ key, label }) => (
              <View key={key} style={styles.priceRow}>
                <Text style={styles.priceLabel}>{label}</Text>
                <View style={styles.priceInputWrap}>
                  <TextInput
                    style={styles.priceInput}
                    value={pricing[key] ?? ''}
                    onChangeText={(t) => setPricing((prev) => ({ ...prev, [key]: t.replace(/[^0-9]/g, '') }))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#C4C4C4"
                  />
                  <Text style={styles.priceUnit}>원~</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 협업 브랜드 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>협업 브랜드</Text>
            <Text style={styles.sectionDesc}>함께 일한 브랜드를 추가하면 신뢰도가 올라가요</Text>
            <View style={styles.brandInputRow}>
              <TextInput
                style={styles.brandInput}
                value={brandInput}
                onChangeText={setBrandInput}
                placeholder="브랜드명 입력"
                placeholderTextColor="#C4C4C4"
                onSubmitEditing={addBrand}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.brandAddBtn} onPress={addBrand} activeOpacity={0.8}>
                <Text style={styles.brandAddBtnText}>추가</Text>
              </TouchableOpacity>
            </View>
            {pastBrands.length > 0 && (
              <View style={styles.tagsWrap}>
                {pastBrands.map((brand) => (
                  <View key={brand} style={styles.tag}>
                    <Text style={styles.tagText}>{brand}</Text>
                    <TouchableOpacity onPress={() => removeBrand(brand)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Text style={styles.tagRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {pastBrands.length === 0 && (
              <Text style={styles.emptyBrands}>아직 추가된 브랜드가 없어요</Text>
            )}
          </View>

          {/* 인바운드 폼 */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>협찬 문의 폼 활성화</Text>
                <Text style={styles.sectionDesc}>브랜드가 미디어 키트에서 직접 협찬을 제안할 수 있어요</Text>
              </View>
              <Switch
                value={isFormEnabled}
                onValueChange={setIsFormEnabled}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            {isFormEnabled && (
              <View style={styles.formEnabledBadge}>
                <Text style={styles.formEnabledText}>✓ 문의 폼이 활성화된 상태입니다. 브랜드가 문의를 보낼 수 있어요.</Text>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  title:    { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  saveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10, minWidth: 52, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  scroll: { paddingHorizontal: 20 },

  section: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  sectionDesc:  { fontSize: 12, color: '#9CA3AF', marginBottom: 14, lineHeight: 18 },

  bioInput: {
    backgroundColor: '#F4F0FF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1A1A2E', lineHeight: 22, minHeight: 100,
  },
  charCount: { fontSize: 11, color: '#C4C4C4', textAlign: 'right', marginTop: 6 },

  priceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  priceLabel:     { fontSize: 13, color: '#374151', flex: 1 },
  priceInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceInput: {
    backgroundColor: '#F4F0FF', borderRadius: 8, borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 14, fontWeight: '600', color: '#1A1A2E',
    width: 110, textAlign: 'right',
  },
  priceUnit: { fontSize: 13, color: '#9CA3AF' },

  brandInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  brandInput: {
    flex: 1, backgroundColor: '#F4F0FF', borderRadius: 10, borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#1A1A2E',
  },
  brandAddBtn: {
    backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  brandAddBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  tagsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0EFFE', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  tagText:   { fontSize: 13, fontWeight: '600', color: colors.primary },
  tagRemove: { fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  emptyBrands: { fontSize: 13, color: '#C4C4C4', textAlign: 'center', paddingVertical: 8 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  formEnabledBadge: {
    marginTop: 12, backgroundColor: '#D1FAE5', borderRadius: 10, padding: 10,
  },
  formEnabledText: { fontSize: 12, color: '#059669', fontWeight: '500', lineHeight: 18 },
});
