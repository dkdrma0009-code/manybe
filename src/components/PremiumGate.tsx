import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FEATURES } from '../config/featureFlags';
import { PREMIUM_FEATURE_META, type PremiumFeature } from '../types/subscription';
import { MonetizationAnalytics } from '../services/MonetizationAnalytics';
import { useGating } from '../hooks/useGating';
import { tokens } from '../constants/tokens';
import type { RootStackParamList } from '../navigation/AppNavigator';

interface Props {
  feature: PremiumFeature;
  children: React.ReactNode;
  /** Height to show before the gradient fade kicks in (default 80) */
  previewHeight?: number;
}

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function PremiumGate({ feature, children, previewHeight = 80 }: Props) {
  const { isLocked } = useGating(feature);
  const nav = useNavigation<NavProp>();
  const meta = PREMIUM_FEATURE_META[feature];

  useEffect(() => {
    if (isLocked) MonetizationAnalytics.paywallImpression(feature);
  // Only fire on mount when locked — intentional single-fire
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  // Paywall disabled globally → passthrough
  if (!FEATURES.PAYWALL_ENABLED || !isLocked) {
    return <>{children}</>;
  }

  function handleUpgrade() {
    MonetizationAnalytics.upgradeTap(`gate_${feature}`);
    nav.navigate('Upgrade');
  }

  return (
    <View style={s.wrapper}>
      {/* Preview content: clip to previewHeight + fade zone */}
      <View style={[s.previewClip, { maxHeight: previewHeight + 60 }]}>
        {children}
      </View>

      {/* Gradient fade overlay */}
      <LinearGradient
        colors={['transparent', tokens.surface]}
        style={[s.fade, { top: previewHeight }]}
        pointerEvents="none"
      />

      {/* Lock CTA */}
      <View style={s.cta}>
        <Text style={s.lockIcon}>{meta.icon}</Text>
        <Text style={s.ctaTitle}>{meta.title}</Text>
        <Text style={s.ctaDesc}>{meta.description}</Text>
        <TouchableOpacity style={s.ctaButton} onPress={handleUpgrade} activeOpacity={0.85}>
          <Text style={s.ctaButtonText}>Pro로 업그레이드 →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
  previewClip: { overflow: 'hidden' },
  fade: {
    position: 'absolute',
    left: 0, right: 0,
    height: 80,
  },
  cta: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 6,
    backgroundColor: tokens.surface,
  },
  lockIcon: { fontSize: 28, marginBottom: 2 },
  ctaTitle: { fontSize: 15, fontWeight: '800', color: tokens.ink, textAlign: 'center' },
  ctaDesc: { fontSize: 12, color: tokens.ink3, textAlign: 'center', lineHeight: 17, marginBottom: 4 },
  ctaButton: {
    backgroundColor: tokens.primary,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 4,
  },
  ctaButtonText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
});
