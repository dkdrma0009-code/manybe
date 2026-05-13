import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';

const FEATURES = [
  { icon: '📬', text: '인바운드 협찬 문의 수신 + CRM 자동 등록' },
  { icon: '🔓', text: '미디어 키트 문의 폼 활성화' },
  { icon: '📊', text: '미디어 키트 방문자 통계 (일별 조회수)' },
  { icon: '📄', text: 'PDF 리포트 내보내기' },
  { icon: '💾', text: '수익·협찬 데이터 무제한 보관' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  reason?: string;
}

export default function PremiumPaywallModal({ visible, onClose, reason }: Props) {
  function handleUpgrade() {
    Linking.openURL('https://manybe-web.vercel.app/premium');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <LinearGradient
            colors={['#6C63FF', '#9B95FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PREMIUM</Text>
            </View>
            <Text style={styles.heroTitle}>
              {reason ? `${reason}은 프리미엄 기능입니다` : '프리미엄으로 업그레이드'}
            </Text>
            <Text style={styles.heroSub}>
              브랜드의 협찬 문의를 놓치지 마세요
            </Text>
          </LinearGradient>

          <View style={styles.body}>
            {FEATURES.map((feature) => (
              <View key={feature.text} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}

            <View style={styles.priceBox}>
              <Text style={styles.price}>월 9,900원</Text>
              <Text style={styles.priceSub}>언제든 해지 가능</Text>
            </View>

            <TouchableOpacity style={styles.cta} onPress={handleUpgrade} activeOpacity={0.88}>
              <Text style={styles.ctaText}>✨ 프리미엄 시작하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.laterText}>나중에</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: Platform.OS === 'ios' ? 24 : 16 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 0,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 8,
    marginTop: 8,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 0,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F0EFFE',
    alignItems: 'center', justifyContent: 'center',
  },
  featureIcon: { fontSize: 17 },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 20,
    marginBottom: 16,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  priceSub: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  laterBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  laterText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});
