import { Text } from '@/components/Text';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FEATURES } from '../config/featureFlags';
import { MonetizationAnalytics } from '../services/MonetizationAnalytics';
import { useSubscription } from '../hooks/useSubscription';
import { tokens } from '../constants/tokens';
import type { RootStackParamList } from '../navigation/AppNavigator';

interface Props {
  source?: string;
}

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function PaywallBanner({ source = 'banner' }: Props) {
  const nav = useNavigation<NavProp>();
  const { tier } = useSubscription();

  if (!FEATURES.PAYWALL_ENABLED || tier === 'premium') return null;

  function handlePress() {
    MonetizationAnalytics.upgradeTap(source);
    nav.navigate('Upgrade');
  }

  return (
    <TouchableOpacity style={s.banner} onPress={handlePress} activeOpacity={0.88}>
      <View style={s.content}>
        <Text style={s.icon}>⚡</Text>
        <View style={s.text}>
          <Text style={s.title}>MANYBE Pro로 업그레이드</Text>
          <Text style={s.sub}>AI 인텔리전스 전체 기능 · 월 9,900원</Text>
        </View>
      </View>
      <View style={s.cta}>
        <Text style={s.ctaText}>시작하기 →</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: tokens.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 22 },
  text: { flex: 1 },
  title: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  cta: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  ctaText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});
