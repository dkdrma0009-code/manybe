import { Text } from '@/components/Text';
import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdvertiserRootStackParamList } from '../../navigation/AdvertiserNavigator';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { tokens } from '../../constants/tokens';
import { formatCountKo as formatCount } from '../../utils/formatters';

type Nav  = NativeStackNavigationProp<AdvertiserRootStackParamList>;
type Route = RouteProp<AdvertiserRootStackParamList, 'CreatorProfile'>;

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface SocialChannel {
  id: string;
  platform: string;
  channel_name: string | null;
  handle: string | null;
  subscriber_count: number | null;
  view_count: number | null;
  video_count: number | null;
}

type PricingKey = 'short_form' | 'long_form' | 'story' | 'mention' | 'dedicated';
const PRICING_LABELS: Record<PricingKey, string> = {
  short_form: '숏폼 (60초 이하)',
  long_form:  '롱폼 (10분 이상)',
  story:      '스토리 / 릴스',
  mention:    '제품 언급',
  dedicated:  '전체 광고 영상',
};

export default function CreatorProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [pricing, setPricing] = useState<Partial<Record<PricingKey, number>>>({});
  const [loading, setLoading] = useState(true);
  const [proposalModal, setProposalModal] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url').eq('id', params.creatorId).single(),
      supabase.from('social_channels').select('id, platform, channel_name, handle, subscriber_count, view_count, video_count').eq('user_id', params.creatorId),
      supabase.from('media_kits').select('pricing').eq('user_id', params.creatorId).limit(1).single(),
    ]).then(([profileRes, channelsRes, kitRes]) => {
      setProfile(profileRes.data ?? null);
      setChannels(channelsRes.data ?? []);
      if (kitRes.data?.pricing) setPricing(kitRes.data.pricing as Partial<Record<PricingKey, number>>);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [params.creatorId]);

  function handleSendProposal() {
    navigation.navigate('SendProposal', { creatorId: params.creatorId, creatorName: profile?.full_name ?? '' });
  }

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
      >
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>크리에이터 프로필</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.profileSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={s.name}>{profile?.full_name ?? '이름 없음'}</Text>
          <Text style={s.role}>크리에이터</Text>
        </View>

        {channels.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>채널 정보</Text>
            {channels.map((ch) => (
              <View key={ch.id} style={s.channelCard}>
                <View style={s.channelLeft}>
                  <Text style={s.channelPlatform}>
                    {ch.platform === 'youtube' ? 'YouTube' : ch.platform === 'instagram' ? 'Instagram' : ch.platform}
                  </Text>
                  <Text style={s.channelName} numberOfLines={1}>{ch.channel_name ?? ch.handle ?? '-'}</Text>
                  {ch.handle && <Text style={s.channelHandle}>@{ch.handle}</Text>}
                </View>
                <View style={s.channelStats}>
                  {ch.subscriber_count != null && (
                    <View style={s.stat}>
                      <Text style={s.statValue}>{formatCount(ch.subscriber_count)}</Text>
                      <Text style={s.statLabel}>구독자</Text>
                    </View>
                  )}
                  {ch.view_count != null && ch.view_count > 0 && (
                    <View style={s.stat}>
                      <Text style={s.statValue}>{formatCount(ch.view_count)}</Text>
                      <Text style={s.statLabel}>총 조회수</Text>
                    </View>
                  )}
                  {ch.video_count != null && ch.video_count > 0 && (
                    <View style={s.stat}>
                      <Text style={s.statValue}>{ch.video_count}</Text>
                      <Text style={s.statLabel}>영상 수</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {Object.keys(pricing).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>협찬 단가 메뉴</Text>
            <View style={s.pricingCard}>
              {(Object.entries(pricing) as [PricingKey, number][])
                .filter(([, v]) => v > 0)
                .map(([key, value], idx, arr) => (
                  <View key={key}>
                    <View style={s.pricingRow}>
                      <Text style={s.pricingLabel}>{PRICING_LABELS[key]}</Text>
                      <Text style={s.pricingValue}>{value.toLocaleString('ko-KR')}원</Text>
                    </View>
                    {idx < arr.length - 1 && <View style={s.pricingDivider} />}
                  </View>
                ))
              }
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky 하단 CTA — 배민 "주문하기" 패턴 */}
      <View style={[s.stickyBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={s.proposalBtn} onPress={handleSendProposal} activeOpacity={0.88}>
          <Text style={s.proposalBtnText}>협찬 제안 보내기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stickyBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 28, color: colors.text, lineHeight: 32 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: tokens.actionSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: tokens.action },
  name: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  role: { fontSize: 14, color: colors.textSecondary },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10,
  },
  channelCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  channelLeft: { gap: 2 },
  channelPlatform: { fontSize: 12, fontWeight: '700', color: tokens.action, textTransform: 'uppercase', letterSpacing: 0.5 },
  channelName: { fontSize: 14, fontWeight: '600', color: colors.text, maxWidth: 140 },
  channelHandle: { fontSize: 12, color: colors.textSecondary },
  channelStats: { flexDirection: 'row', gap: 20 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  pricingCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  pricingLabel: { fontSize: 14, color: colors.text },
  pricingValue: { fontSize: 14, fontWeight: '700', color: tokens.action },
  pricingDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  proposalBtn: {
    backgroundColor: tokens.action,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  proposalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
