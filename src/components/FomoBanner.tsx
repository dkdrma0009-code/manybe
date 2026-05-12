import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';

import { colors } from '../constants/colors';

interface FomoItem {
  icon: string;
  text: string;
}

const FOMO_ITEMS: FomoItem[] = [
  { icon: '📬', text: '삼성전자에서 협찬 문의가 도착했어요' },
  { icon: '💌', text: '올리브영에서 콜라보 제안이 왔어요' },
  { icon: '🔔', text: '나이키 담당자가 단가를 물어봤어요' },
];

function BlurredRow({ item }: { item: FomoItem }) {
  return (
    <View style={styles.blurRow}>
      <Text style={styles.blurIcon}>{item.icon}</Text>
      <View style={styles.blurTextWrap}>
        <Text style={styles.blurText}>{item.text}</Text>
        <View style={styles.blurOverlay} />
      </View>
    </View>
  );
}

interface Props {
  variant?: 'home' | 'deals';
}

export default function FomoBanner({ variant = 'home' }: Props) {
  const title = variant === 'deals'
    ? '잠든 사이에도 협찬 문의가 들어와요'
    : '브랜드가 먼저 연락해오는 경험';

  const desc = variant === 'deals'
    ? '미디어 키트 인바운드 폼을 활성화하면\n브랜드가 직접 협찬을 제안합니다.'
    : '미디어 키트 공개 페이지에 문의 폼을 달면\n자는 동안에도 협찬 제안이 들어옵니다.';

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* 블러 미리보기 */}
      <View style={styles.preview}>
        {FOMO_ITEMS.map((item) => (
          <BlurredRow key={item.text} item={item} />
        ))}
        <View style={styles.lockOverlay}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockText}>Pro에서 실제 문의를 확인하세요</Text>
        </View>
      </View>

      {/* 설명 */}
      <Text style={styles.desc}>{desc}</Text>

      {/* CTA */}
      <TouchableOpacity
        style={styles.cta}
        onPress={() => Linking.openURL('https://manybe-web.vercel.app/premium')}
        activeOpacity={0.88}
      >
        <Text style={styles.ctaText}>✨ Pro 플랜 시작하기</Text>
        <Text style={styles.ctaSub}>월 9,900원 · 언제든 해지 가능</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  proBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
  },
  preview: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  blurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  blurIcon: {
    fontSize: 16,
  },
  blurTextWrap: {
    flex: 1,
    position: 'relative',
  },
  blurText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,46,0.6)',
    borderRadius: 4,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  lockIcon: { fontSize: 22 },
  lockText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  desc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 18,
    marginBottom: 16,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  ctaSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
});