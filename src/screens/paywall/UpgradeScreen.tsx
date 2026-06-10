import { Text } from '@/components/Text';
import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../../hooks/useSubscription';
import { PRODUCT_IDS, type Product } from '../../types/subscription';
import { MonetizationAnalytics } from '../../services/MonetizationAnalytics';
import { restorePurchases } from '../../services/SubscriptionService';
import { tokens } from '../../constants/tokens';

const FEATURES_LIST = [
  { icon: '🔮', title: '예측 인텔리전스',     desc: '다음 달 수익 예측 + 불확실성 범위' },
  { icon: '🧠', title: 'AI 코치 & 주간 리뷰', desc: '매주 AI가 분석한 코칭 인사이트' },
  { icon: '📈', title: '수익 안정성 분석',     desc: '변동성 점수 + 안정화 전략' },
  { icon: '📊', title: '트렌드 인텔리전스',    desc: '번아웃 위험 · 응답 속도 · 집중도' },
  { icon: '🤖', title: 'AI 분석 설명',         desc: '헬스 점수 계산 근거 전체 공개' },
  { icon: '⚡', title: 'AI 추천 액션',         desc: '우선순위 자동화 추천 액션 플랜' },
  { icon: '🎯', title: '브랜드 리스크 분석',   desc: '의존도 위험 + 다변화 기회 분석' },
  { icon: '🤝', title: '무제한 협찬 관리',     desc: '협찬 수 제한 없이 모든 프로젝트' },
];

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const { products, purchasing, purchase, tier } = useSubscription();
  const [selectedId, setSelectedId] = useState<string>(PRODUCT_IDS.ANNUAL);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    // Pre-select annual if available, else monthly
    if (products.length > 0) {
      const annual = products.find((p) => p.period === 'annual');
      setSelectedId(annual?.identifier ?? products[0].identifier);
    }
  }, [products]);

  if (tier === 'premium') {
    return (
      <View style={[s.successContainer, { paddingTop: insets.top + 60 }]}>
        <Text style={s.successIcon}>🎉</Text>
        <Text style={s.successTitle}>이미 Pro 회원입니다!</Text>
        <Text style={s.successDesc}>MANYBE의 모든 AI 기능을 이용하고 있습니다.</Text>
        <TouchableOpacity style={s.closeBtn} onPress={() => nav.goBack()} activeOpacity={0.8}>
          <Text style={s.closeBtnText}>닫기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedProduct = products.find((p) => p.identifier === selectedId);
  const annualProduct   = products.find((p) => p.period === 'annual');
  const monthlyProduct  = products.find((p) => p.period === 'monthly');

  async function handlePurchase() {
    if (!selectedId) return;
    const result = await purchase(selectedId);
    if (result.success) {
      Alert.alert('구독 완료!', 'MANYBE Pro로 업그레이드되었습니다. 모든 AI 기능을 사용할 수 있습니다.', [
        { text: '확인', onPress: () => nav.goBack() },
      ]);
    } else if (!result.cancelled && result.error) {
      Alert.alert('결제 실패', result.error);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    const state = await restorePurchases();
    setRestoring(false);
    if (state.tier === 'premium') {
      Alert.alert('복원 완료', 'Pro 구독이 복원되었습니다.', [
        { text: '확인', onPress: () => nav.goBack() },
      ]);
    } else {
      Alert.alert('복원 실패', '구독 내역을 찾을 수 없습니다.');
    }
  }

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient */}
        <LinearGradient
          colors={[tokens.primary, tokens.primaryDeep]}
          style={[s.hero, { paddingTop: insets.top + 20 }]}
        >
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => nav.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.backText}>✕</Text>
          </TouchableOpacity>

          <View style={s.heroContent}>
            <Text style={s.heroLabel}>MANYBE PRO</Text>
            <Text style={s.heroTitle}>나의 AI COO{'\n'}가 되어드립니다</Text>
            <Text style={s.heroSub}>Creator 비즈니스를 운영하는{'\n'}AI 파트너로 진화합니다</Text>
          </View>
        </LinearGradient>

        {/* Plan selector */}
        <View style={s.planSection}>
          <Text style={s.planSectionTitle}>플랜 선택</Text>

          <View style={s.planRow}>
            {/* Annual plan */}
            {annualProduct && (
              <TouchableOpacity
                style={[s.planCard, selectedId === annualProduct.identifier && s.planCardSelected]}
                onPress={() => setSelectedId(annualProduct.identifier)}
                activeOpacity={0.85}
              >
                <View style={s.planBadgeRow}>
                  <View style={s.saveBadge}>
                    <Text style={s.saveBadgeText}>33% 절약</Text>
                  </View>
                </View>
                <Text style={[s.planPrice, selectedId === annualProduct.identifier && s.planPriceSelected]}>
                  {annualProduct.priceString}
                </Text>
                <Text style={s.planPeriod}>/ 1년</Text>
                <Text style={s.planMonthly}>
                  월 {Math.round(annualProduct.price / 12).toLocaleString('ko-KR')}원 환산
                </Text>
              </TouchableOpacity>
            )}

            {/* Monthly plan */}
            {monthlyProduct && (
              <TouchableOpacity
                style={[s.planCard, selectedId === monthlyProduct.identifier && s.planCardSelected]}
                onPress={() => setSelectedId(monthlyProduct.identifier)}
                activeOpacity={0.85}
              >
                <View style={s.planBadgeRow} />
                <Text style={[s.planPrice, selectedId === monthlyProduct.identifier && s.planPriceSelected]}>
                  {monthlyProduct.priceString}
                </Text>
                <Text style={s.planPeriod}>/ 월</Text>
                <Text style={s.planMonthly}>자유롭게 해지 가능</Text>
              </TouchableOpacity>
            )}

            {/* Fallback while products load */}
            {products.length === 0 && (
              <View style={s.planLoadingRow}>
                <ActivityIndicator color={tokens.primary} />
              </View>
            )}
          </View>

          <Text style={s.trialNote}>
            7일 무료 체험 포함 · 언제든지 해지 가능 · {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}로 결제
          </Text>
        </View>

        {/* Feature list */}
        <View style={s.featuresSection}>
          <Text style={s.planSectionTitle}>Pro에서만 사용 가능</Text>
          {FEATURES_LIST.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <View style={s.featureBody}>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
              <Text style={s.featureCheck}>✓</Text>
            </View>
          ))}
        </View>

        {/* Social proof */}
        <View style={s.quoteCard}>
          <Text style={s.quoteText}>
            "협찬 수익이 늘었는데 어디서 오는지 몰랐어요.{'\n'}MANYBE Pro가 브랜드 의존도 문제를 찾아줬습니다."
          </Text>
          <Text style={s.quoteAuthor}>— 뷰티 크리에이터, 구독자 52만</Text>
        </View>
      </ScrollView>

      {/* Sticky CTA bar */}
      <View style={[s.ctaBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[s.ctaButton, (purchasing || restoring) && s.ctaButtonDisabled]}
          onPress={handlePurchase}
          activeOpacity={0.88}
          disabled={purchasing || restoring}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.ctaButtonText}>
              {selectedProduct
                ? `${selectedProduct.priceString}으로 시작하기`
                : '시작하기'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring || purchasing}
          style={s.restoreBtn}
        >
          <Text style={s.restoreText}>
            {restoring ? '복원 중...' : '구매 복원'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.bg },
  scroll: { flex: 1 },

  // Hero
  hero: { paddingHorizontal: 24, paddingBottom: 36 },
  backBtn: { alignSelf: 'flex-end', padding: 8 },
  backText: { fontSize: 18, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
  heroContent: { marginTop: 12, gap: 10 },
  heroLabel: {
    fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 32, fontWeight: '800', color: '#fff',
    letterSpacing: -1.2, lineHeight: 38,
  },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 21 },

  // Plan section
  planSection: { paddingHorizontal: 16, paddingTop: 24 },
  planSectionTitle: {
    fontSize: 13, fontWeight: '800', color: tokens.ink4,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  planRow: { flexDirection: 'row', gap: 10 },
  planCard: {
    flex: 1, borderRadius: 14,
    borderWidth: 2, borderColor: tokens.border,
    backgroundColor: tokens.surface,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14,
    gap: 2,
  },
  planCardSelected: { borderColor: tokens.primary, backgroundColor: tokens.primarySofter },
  planBadgeRow: { height: 22, justifyContent: 'center' },
  saveBadge: {
    backgroundColor: tokens.uploaded, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start',
  },
  saveBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  planPrice: { fontSize: 22, fontWeight: '800', color: tokens.ink, letterSpacing: -0.8, marginTop: 4 },
  planPriceSelected: { color: tokens.primary },
  planPeriod: { fontSize: 12, color: tokens.ink4 },
  planMonthly: { fontSize: 10, color: tokens.ink4, marginTop: 4 },
  planLoadingRow: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  trialNote: {
    fontSize: 11, color: tokens.ink4, textAlign: 'center',
    marginTop: 12, lineHeight: 16,
  },

  // Features
  featuresSection: { paddingHorizontal: 16, paddingTop: 24 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: tokens.border,
  },
  featureIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  featureBody: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: tokens.ink },
  featureDesc: { fontSize: 12, color: tokens.ink3, marginTop: 2 },
  featureCheck: { fontSize: 16, color: tokens.uploaded, fontWeight: '800' },

  // Quote
  quoteCard: {
    margin: 16, marginTop: 24, padding: 18,
    backgroundColor: tokens.surface, borderRadius: 14,
    borderWidth: 1, borderColor: tokens.border,
  },
  quoteText: { fontSize: 13, color: tokens.ink2, lineHeight: 20, fontStyle: 'italic' },
  quoteAuthor: { fontSize: 11, color: tokens.ink4, marginTop: 10, fontWeight: '600' },

  // CTA bar
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: tokens.surface,
    borderTopWidth: 1, borderTopColor: tokens.border,
    paddingHorizontal: 16, paddingTop: 12,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 12 },
    }),
  },
  ctaButton: {
    backgroundColor: tokens.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
  },
  ctaButtonDisabled: { opacity: 0.6 },
  ctaButtonText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  restoreBtn: { alignItems: 'center', paddingVertical: 4 },
  restoreText: { fontSize: 12, color: tokens.ink4 },

  // Success state
  successContainer: {
    flex: 1, alignItems: 'center', gap: 10,
    backgroundColor: tokens.bg, paddingHorizontal: 32,
  },
  successIcon: { fontSize: 54, marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '800', color: tokens.ink },
  successDesc: { fontSize: 14, color: tokens.ink3, textAlign: 'center', lineHeight: 20 },
  closeBtn: {
    marginTop: 24, backgroundColor: tokens.primary,
    paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12,
  },
  closeBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
