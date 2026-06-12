import { Text } from '@/components/Text';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useMediaKit } from '../../hooks/useMediaKit';
import { ENV } from '../../config/env';
import { colors } from '../../constants/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';
import type { CreatorBadge, BadgeId } from '../../types/mediaKit';
import { BADGE_CATALOG, THEME_CATALOG } from '../../types/mediaKit';
import { Image } from 'react-native';

// 문의 폼이 포함된 웹 공개 페이지 (web/app/[slug]) — 슬러그 화면과 동일 베이스
const WEB_BASE_URL = ENV.WEB_BASE_URL;
const WEB_HOST = WEB_BASE_URL.replace(/^https?:\/\//, '');

const PRICING_LABELS: Record<string, string> = {
  short_form: '숏폼 (60초 이하)',
  long_form:  '롱폼 (10분 이상)',
  story:      '스토리 / 릴스',
  mention:    '제품 언급',
  dedicated:  '전체 광고 영상',
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MediaKitPreview'>;
};

function Badge({ badge }: { badge: CreatorBadge }) {
  return (
    <View style={[styles.badge, { backgroundColor: badge.bgColor }]}>
      <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
      <Text style={[styles.badgeValue, { color: badge.color }]}>{badge.value}</Text>
    </View>
  );
}

export default function MediaKitPreviewScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { kitData, intelligence, loading, generating, load, generate } = useMediaKit();
  const [copied, setCopied] = useState(false);
  const [pitchCopied, setPitchCopied] = useState(false);
  const [activePitch, setActivePitch] = useState<'short' | 'long'>('short');

  const userName = user?.user_metadata?.full_name ?? '크리에이터';
  const initial = userName.charAt(0).toUpperCase();

  // 화면이 포커스될 때마다 다시 로드 — 편집 후 돌아와도 최신 데이터 반영
  useFocusEffect(
    useCallback(() => {
      load().then((kit) => generate(kit));
    }, [load]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  function handleCopyUrl() {
    if (!kitData?.slug) {
      Alert.alert(
        'URL이 아직 없어요',
        '주소(슬러그)를 설정하면 브랜드에 보낼 수 있는 공개 링크가 생깁니다.',
        [
          { text: '나중에', style: 'cancel' },
          { text: 'URL 설정하기', onPress: () => navigation.navigate('MediaKitSlug') },
        ],
      );
      return;
    }
    Clipboard.setStringAsync(`${WEB_BASE_URL}/${kitData.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyPitch() {
    if (!intelligence) return;
    const text = activePitch === 'short'
      ? intelligence.pitch.short
      : intelligence.pitch.long;
    Clipboard.setStringAsync(text);
    setPitchCopied(true);
    setTimeout(() => setPitchCopied(false), 2000);
  }

  const isLoading = loading || generating;
  const bio = kitData?.bio || intelligence?.aiGeneratedBio || '';
  const pricingEntries = Object.entries(kitData?.pricing ?? {}).filter(([, v]) => v > 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>미디어 키트 미리보기</Text>
          <Text style={styles.subtitle}>브랜드에게 보여지는 내용</Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleCopyUrl} activeOpacity={0.8}>
          <Text style={styles.shareBtnText}>{copied ? '✓ 복사됨' : '🔗 공유'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>AI 분석 중...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* 크리에이터 헤더 */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.creatorName}>{userName}</Text>
            {bio ? (
              <Text style={styles.bio}>{bio}</Text>
            ) : (
              <Text style={styles.bioEmpty}>자기소개를 입력하거나 자동완성을 사용하세요</Text>
            )}
            {kitData?.slug ? (
              <View style={styles.urlChip}>
                <Text style={styles.urlChipText}>{WEB_HOST}/{kitData.slug}</Text>
              </View>
            ) : null}
          </View>

          {/* 선택된 뱃지 */}
          {kitData?.badges && kitData.badges.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>나를 표현하는 뱃지</Text>
              <View style={styles.badgeRow}>
                {kitData.badges.map((id) => {
                  const b = BADGE_CATALOG[id as BadgeId];
                  if (!b) return null;
                  const themeColors = THEME_CATALOG[kitData.theme ?? 'indigo'] ?? THEME_CATALOG.indigo;
                  return (
                    <View key={id} style={[styles.selectedBadgeChip, { backgroundColor: themeColors.bg }]}>
                      <Text style={styles.selectedBadgeEmoji}>{b.emoji}</Text>
                      <Text style={[styles.selectedBadgeLabel, { color: themeColors.primary }]}>{b.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* AI 성과 배지 */}
          {intelligence?.badges && intelligence.badges.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>크리에이터 프로필</Text>
              <View style={styles.badgeRow}>
                {intelligence.badges.map((b) => (
                  <Badge key={b.type} badge={b} />
                ))}
              </View>
            </View>
          )}

          {/* 포트폴리오 통계 */}
          {intelligence && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>협업 현황</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{intelligence.portfolio.dealCount}</Text>
                  <Text style={styles.statLabel}>총 협찬</Text>
                </View>
                <View style={[styles.statCell, styles.statCellBorder]}>
                  <Text style={styles.statValue}>{intelligence.portfolio.settledCount}</Text>
                  <Text style={styles.statLabel}>완료</Text>
                </View>
                <View style={[styles.statCell, styles.statCellBorder]}>
                  <Text style={[styles.statValue, { color: '#059669' }]}>
                    {intelligence.portfolio.reliabilityScore}%
                  </Text>
                  <Text style={styles.statLabel}>완료율</Text>
                </View>
              </View>
            </View>
          )}

          {/* 협업 브랜드 */}
          {intelligence && intelligence.portfolio.topBrands.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>협업 브랜드</Text>
              <View style={styles.tagsWrap}>
                {intelligence.portfolio.topBrands.map((brand) => (
                  <View key={brand} style={styles.brandTag}>
                    <Text style={styles.brandTagText}>{brand}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 광고 단가 */}
          {pricingEntries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>광고 단가</Text>
              {pricingEntries.map(([key, value]) => (
                <View key={key} style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{PRICING_LABELS[key] ?? key}</Text>
                  <Text style={styles.priceValue}>
                    {value.toLocaleString()}원~
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 어필 섹션 (하이라이트) */}
          {kitData?.highlights && kitData.highlights.length > 0 && (
            <View style={styles.section}>
              {kitData.highlights.map((hs) => (
                <View key={hs.id} style={{ marginBottom: 16 }}>
                  <Text style={styles.sectionTitle}>{hs.title}</Text>
                  {hs.items.map((item, idx) => (
                    <View key={idx} style={styles.hlItemRow}>
                      {item.thumbnail ? (
                        <Image source={{ uri: item.thumbnail }} style={styles.hlThumb} />
                      ) : null}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.hlLabel}>{item.label}</Text>
                        {item.note ? <Text style={styles.hlNote}>{item.note}</Text> : null}
                      </View>
                      <Text style={styles.hlValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* 문의 폼 안내 */}
          {kitData?.isFormEnabled && kitData.slug && (
            <View style={[styles.section, styles.inquirySection]}>
              <Text style={styles.inquiryIcon}>📬</Text>
              <Text style={styles.inquiryTitle}>협찬 문의 받는 중</Text>
              <Text style={styles.inquiryDesc}>
                브랜드가 직접 협찬 문의를 넣을 수 있어요.
              </Text>
            </View>
          )}

          {/* 협업 피치 */}
          {intelligence && (
            <View style={styles.section}>
              <View style={styles.pitchHeader}>
                <Text style={styles.sectionTitle}>협업 제안 문구</Text>
                <Text style={styles.pitchHint}>자동생성</Text>
              </View>
              <View style={styles.pitchTabs}>
                <TouchableOpacity
                  style={[styles.pitchTab, activePitch === 'short' && styles.pitchTabActive]}
                  onPress={() => setActivePitch('short')}
                >
                  <Text style={[styles.pitchTabText, activePitch === 'short' && styles.pitchTabTextActive]}>
                    짧은 버전
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pitchTab, activePitch === 'long' && styles.pitchTabActive]}
                  onPress={() => setActivePitch('long')}
                >
                  <Text style={[styles.pitchTabText, activePitch === 'long' && styles.pitchTabTextActive]}>
                    긴 버전
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pitchBox}>
                <Text style={styles.pitchText}>
                  {activePitch === 'short'
                    ? intelligence.pitch.short
                    : intelligence.pitch.long}
                </Text>
              </View>
              <TouchableOpacity style={styles.copyPitchBtn} onPress={handleCopyPitch} activeOpacity={0.8}>
                <Text style={styles.copyPitchBtnText}>
                  {pitchCopied ? '✓ 복사됨' : '📋 복사하기'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F5F3EF' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#9CA3AF' },

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
  shareBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  scroll: { paddingHorizontal: 20 },

  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText:  { fontSize: 30, fontWeight: '800', color: '#fff' },
  creatorName: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 8 },
  bio: {
    fontSize: 14, color: '#4B5563', lineHeight: 22,
    textAlign: 'center', marginBottom: 12,
  },
  bioEmpty: {
    fontSize: 13, color: '#C4C4C4', textAlign: 'center', marginBottom: 12,
  },
  urlChip: {
    backgroundColor: '#F0EFFE', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  urlChipText: { fontSize: 11, color: colors.primary, fontWeight: '600' },

  section: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 14 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedBadgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  selectedBadgeEmoji: { fontSize: 15 },
  selectedBadgeLabel: { fontSize: 13, fontWeight: '700' },
  badge: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    alignItems: 'center',
  },
  badgeLabel: { fontSize: 10, fontWeight: '600', marginBottom: 1 },
  badgeValue: { fontSize: 13, fontWeight: '800' },

  statsGrid: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statCellBorder: { borderLeftWidth: 1, borderLeftColor: '#F3F4F6' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#9CA3AF' },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  brandTag: {
    backgroundColor: '#F0EFFE', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  brandTagText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  priceLabel: { fontSize: 13, color: '#374151' },
  priceValue: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },

  inquirySection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  inquiryIcon:  { fontSize: 28, marginBottom: 4 },
  inquiryTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  inquiryDesc:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  pitchHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  pitchHint: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  pitchTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pitchTab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  pitchTabActive: { backgroundColor: '#F0EFFE' },
  pitchTabText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  pitchTabTextActive: { color: colors.primary },
  pitchBox: {
    backgroundColor: '#F9F8FF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E4FF',
    padding: 14, marginBottom: 12,
  },
  pitchText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  copyPitchBtn: {
    backgroundColor: '#1A1A2E', borderRadius: 12, paddingVertical: 11, alignItems: 'center',
  },
  copyPitchBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  hlItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  hlThumb: { width: 72, height: 50, borderRadius: 6, backgroundColor: '#E5E7EB' },
  hlLabel: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  hlNote: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  hlValue: { fontSize: 14, fontWeight: '800', color: colors.primary },
});
