import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markMilestone, trackFunnelEvent } from '../../services/ActivationService';
import { colors } from '../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
}

type CreatorPlatform = 'youtube' | 'instagram' | 'tiktok' | 'blog' | 'other';
type CreatorScale = 'nano' | 'micro' | 'mid' | 'macro';
type InquiryFrequency = 'none' | '1-2' | '3-5' | 'frequent';

const PLATFORMS: { key: CreatorPlatform; label: string; icon: string; color: string }[] = [
  { key: 'youtube',   label: 'YouTube',   icon: '▶️', color: '#FF0000' },
  { key: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C' },
  { key: 'tiktok',    label: 'TikTok',    icon: '🎵', color: '#010101' },
  { key: 'blog',      label: '블로그',     icon: '✏️', color: '#03C75A' },
  { key: 'other',     label: '기타',       icon: '🌐', color: '#6E56F0' },
];

const SCALES: { key: CreatorScale; label: string; sub: string; icon: string }[] = [
  { key: 'nano',  label: '나노',    sub: '1만 이하',     icon: '🌱' },
  { key: 'micro', label: '마이크로', sub: '1만 ~ 10만',  icon: '🌿' },
  { key: 'mid',   label: '미드',    sub: '10만 ~ 100만', icon: '🌳' },
  { key: 'macro', label: '매크로',  sub: '100만+',       icon: '🚀' },
];

const FREQUENCIES: { key: InquiryFrequency; label: string; sub: string; icon: string }[] = [
  { key: 'none',     label: '아직 없어요',  sub: '협찬 문의를 받아본 적 없어요', icon: '🌱' },
  { key: '1-2',      label: '월 1~2건',     sub: '가끔 들어와요',               icon: '📬' },
  { key: '3-5',      label: '월 3~5건',     sub: '꾸준하게 들어와요',           icon: '📨' },
  { key: 'frequent', label: '자주 들어와요', sub: '월 5건 이상',                icon: '🚀' },
];

const TOTAL_STEPS = 4;

export default function OnboardingScreen({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<CreatorPlatform | null>(null);
  const [scale, setScale] = useState<CreatorScale | null>(null);
  const [frequency, setFrequency] = useState<InquiryFrequency | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  function animateNext(nextStep: number) {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -30, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 30, duration: 0, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) animateNext(step + 1);
  }

  function handleBack() {
    if (step > 0) animateNext(step - 1);
  }

  async function handleComplete() {
    if (platform)  await AsyncStorage.setItem('creator_platform', platform);
    if (scale)     await AsyncStorage.setItem('creator_scale', scale);
    if (frequency) await AsyncStorage.setItem('inquiry_frequency', frequency);
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await Promise.all([
      markMilestone('onboarding_complete'),
      trackFunnelEvent('onboarding_completed', {
        platform: platform ?? 'unknown',
        scale:    scale    ?? 'unknown',
        frequency: frequency ?? 'unknown',
      }),
    ]);
    onComplete();
  }

  const canProceed =
    step === 1 ? platform !== null :
    step === 2 ? scale !== null :
    true;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {step > 0 && (
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.dots}>
            {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
              <View key={i} style={[styles.dot, i === step - 1 && styles.dotActive]} />
            ))}
          </View>
          <View style={{ width: 32 }} />
        </View>
      )}

      <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }] }]}>
        {step === 0 && <StepWelcome onNext={handleNext} />}
        {step === 1 && (
          <StepPlatform
            selected={platform}
            onSelect={setPlatform}
            onNext={handleNext}
            canProceed={canProceed}
          />
        )}
        {step === 2 && (
          <StepScale
            selected={scale}
            onSelect={setScale}
            onNext={handleNext}
            canProceed={canProceed}
          />
        )}
        {step === 3 && (
          <StepInquiryFrequency
            selected={frequency}
            onSelect={setFrequency}
            onComplete={handleComplete}
          />
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.stepWrap}>
      <View style={styles.mascotWrap}>
        <View style={styles.mascotBubble}>
          <Text style={styles.mascotEmoji}>🤝</Text>
        </View>
        <View style={styles.speechBubble}>
          <Text style={styles.speechText}>안녕! 나는 매니봇이야 👋</Text>
        </View>
      </View>
      <Text style={styles.stepTitle}>브랜드 협찬을{'\n'}전문가답게 관리해요</Text>
      <Text style={styles.stepDesc}>
        문의부터 정산까지{'\n'}
        협찬 파이프라인을 한 곳에서 관리하세요
      </Text>

      <View style={styles.featureList}>
        {[
          { icon: '🤝', text: '브랜드 협찬 파이프라인 관리' },
          { icon: '📬', text: '인바운드 문의 자동 처리' },
          { icon: '🔗', text: '미디어 키트 & 협찬 제안서' },
        ].map(({ icon, text }) => (
          <View key={text} style={styles.featureItem}>
            <View style={styles.featureIconWrap}>
              <Text style={styles.featureIcon}>{icon}</Text>
            </View>
            <Text style={styles.featureText}>{text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={onNext} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>시작하기 →</Text>
      </TouchableOpacity>
    </View>
  );
}

function StepPlatform({
  selected, onSelect, onNext, canProceed,
}: {
  selected: CreatorPlatform | null;
  onSelect: (p: CreatorPlatform) => void;
  onNext: () => void;
  canProceed: boolean;
}) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepEmoji}>📱</Text>
      <Text style={styles.stepTitle}>주로 활동하는{'\n'}플랫폼을 선택해주세요</Text>
      <Text style={styles.stepDesc}>복수 채널 운영 시 주력 플랫폼 기준</Text>

      <View style={styles.platformGrid}>
        {PLATFORMS.map(({ key, label, icon, color }) => (
          <TouchableOpacity
            key={key}
            style={[styles.platformCard, selected === key && { borderColor: color, backgroundColor: color + '12' }]}
            onPress={() => onSelect(key)}
            activeOpacity={0.8}
          >
            <Text style={styles.platformIcon}>{icon}</Text>
            <Text style={[styles.platformLabel, selected === key && { color, fontWeight: '800' }]}>{label}</Text>
            {selected === key && (
              <View style={[styles.platformCheck, { backgroundColor: color }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, !canProceed && styles.btnDisabled]}
        onPress={onNext}
        disabled={!canProceed}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>다음 →</Text>
      </TouchableOpacity>
    </View>
  );
}

function StepScale({
  selected, onSelect, onNext, canProceed,
}: {
  selected: CreatorScale | null;
  onSelect: (s: CreatorScale) => void;
  onNext: () => void;
  canProceed: boolean;
}) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepEmoji}>📊</Text>
      <Text style={styles.stepTitle}>채널 규모를{'\n'}알려주세요</Text>
      <Text style={styles.stepDesc}>구독자 · 팔로워 수 기준</Text>

      <View style={styles.scaleList}>
        {SCALES.map(({ key, label, sub, icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.scaleCard, selected === key && styles.scaleCardActive]}
            onPress={() => onSelect(key)}
            activeOpacity={0.8}
          >
            <Text style={styles.scaleIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scaleLabel, selected === key && styles.scaleLabelActive]}>
                {label} 크리에이터
              </Text>
              <Text style={styles.scaleSub}>{sub}</Text>
            </View>
            <View style={[styles.radioOuter, selected === key && styles.radioOuterActive]}>
              {selected === key && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, !canProceed && styles.btnDisabled]}
        onPress={onNext}
        disabled={!canProceed}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>다음 →</Text>
      </TouchableOpacity>
    </View>
  );
}

function StepInquiryFrequency({
  selected, onSelect, onComplete,
}: {
  selected: InquiryFrequency | null;
  onSelect: (f: InquiryFrequency) => void;
  onComplete: () => void;
}) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepEmoji}>📬</Text>
      <Text style={styles.stepTitle}>현재 협찬 문의를{'\n'}얼마나 받고 있나요?</Text>
      <Text style={styles.stepDesc}>맞춤 설정에 활용됩니다 · 언제든 변경 가능해요</Text>

      <View style={styles.scaleList}>
        {FREQUENCIES.map(({ key, label, sub, icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.scaleCard, selected === key && styles.scaleCardActive]}
            onPress={() => onSelect(key)}
            activeOpacity={0.8}
          >
            <Text style={styles.scaleIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scaleLabel, selected === key && styles.scaleLabelActive]}>
                {label}
              </Text>
              <Text style={styles.scaleSub}>{sub}</Text>
            </View>
            <View style={[styles.radioOuter, selected === key && styles.radioOuterActive]}>
              {selected === key && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={onComplete} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>매니비 시작하기 🎉</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onComplete} style={{ marginTop: 12 }} activeOpacity={0.7}>
        <Text style={styles.skipText}>나중에 설정할게요</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4,
  },
  backText: { fontSize: 22, color: '#374151', width: 32 },
  dots:     { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' },
  dotActive:{ width: 20, backgroundColor: colors.primary },

  content: { flex: 1 },

  stepWrap: {
    flex: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 20,
  },

  mascotWrap: { alignItems: 'center', marginBottom: 32 },
  mascotBubble: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#F0EFFE',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  mascotEmoji:  { fontSize: 56 },
  speechBubble: {
    marginTop: 12, backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderTopLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  speechText: { fontSize: 14, color: '#374151', fontWeight: '600' },

  stepTitle: {
    fontSize: 26, fontWeight: '800', color: colors.text,
    lineHeight: 36, marginBottom: 10,
  },
  stepDesc: {
    fontSize: 14, color: colors.textSecondary,
    lineHeight: 22, marginBottom: 28,
  },
  stepEmoji: { fontSize: 48, marginBottom: 16 },

  featureList: { gap: 12, marginBottom: 32 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#F0EFFE',
    alignItems: 'center', justifyContent: 'center',
  },
  featureIcon: { fontSize: 20 },
  featureText: { fontSize: 15, fontWeight: '600', color: colors.text },

  platformGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28,
  },
  platformCard: {
    width: (SCREEN_WIDTH - 56 - 10) / 2,
    borderWidth: 2, borderColor: '#E8E4FF', borderRadius: 16,
    padding: 16, alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    position: 'relative',
  },
  platformIcon:  { fontSize: 28, marginBottom: 6 },
  platformLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  platformCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  scaleList: { gap: 10, marginBottom: 28 },
  scaleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: '#E8E4FF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  scaleCardActive:  { borderColor: colors.primary, backgroundColor: '#F5F3FF' },
  scaleIcon:        { fontSize: 28 },
  scaleLabel:       { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 2 },
  scaleLabelActive: { color: colors.primary },
  scaleSub:         { fontSize: 12, color: '#9CA3AF' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    marginTop: 32,
  },
  btnDisabled:    { opacity: 0.45, shadowOpacity: 0 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  skipText:       { textAlign: 'center', color: '#9CA3AF', fontSize: 13 },
});
