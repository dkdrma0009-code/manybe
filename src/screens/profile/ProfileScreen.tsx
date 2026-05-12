import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { usePlan } from '../../hooks/usePlan';
import { useSocialChannels } from '../../hooks/useSocialChannels';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';
import EditProfileModal from './EditProfileModal';

interface Stats {
  dealCount: number;
  totalRevenue: number;
  completedDeals: number;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { plan } = usePlan(user?.id);
  const { channels, formatCount } = useSocialChannels(user?.id);
  const [stats, setStats] = useState<Stats>({ dealCount: 0, totalRevenue: 0, completedDeals: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '크리에이터';
  const userEmail = user?.email ?? '';
  const initial = userName.charAt(0).toUpperCase();
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
    : '';

  useEffect(() => {
    setDisplayName(userName);
  }, [userName]);

  useEffect(() => {
    if (!user?.id) { setLoadingStats(false); return; }
    Promise.all([
      supabase.from('deals').select('id, status, amount').eq('user_id', user.id),
      supabase.from('revenue').select('amount').eq('user_id', user.id),
    ]).then(([dealsRes, revRes]) => {
      const deals = dealsRes.data ?? [];
      const totalRevenue = (revRes.data ?? []).reduce((s, r) => s + r.amount, 0);
      setStats({
        dealCount: deals.length,
        completedDeals: deals.filter((d) => d.status === 'completed').length,
        totalRevenue,
      });
      setLoadingStats(false);
    });
  }, [user?.id]);

  const PLAN_LABEL: Record<string, { label: string; color: string; bg: string }> = {
    free:    { label: '무료 플랜', color: '#6B7280', bg: '#F3F4F6' },
    premium: { label: '프리미엄', color: '#7C3AED', bg: '#EDE9FE' },
  };
  const planInfo = PLAN_LABEL[plan] ?? PLAN_LABEL.free;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필</Text>
        <TouchableOpacity onPress={() => setShowEdit(true)} style={styles.editBtn}>
          <Text style={styles.editBtnText}>편집</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* 아바타 + 이름 */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{userEmail}</Text>
          {joinedDate ? <Text style={styles.joined}>{joinedDate} 가입</Text> : null}
          <View style={[styles.planBadge, { backgroundColor: planInfo.bg }]}>
            <Text style={[styles.planBadgeText, { color: planInfo.color }]}>{planInfo.label}</Text>
          </View>
        </View>

        {/* 활동 통계 */}
        <View style={styles.statsCard}>
          {loadingStats ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.dealCount}</Text>
                <Text style={styles.statLabel}>총 협찬</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.completedDeals}</Text>
                <Text style={styles.statLabel}>계약 완료</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { fontSize: 15 }]}>
                  {stats.totalRevenue >= 10000
                    ? `${(stats.totalRevenue / 10000).toFixed(0)}만`
                    : stats.totalRevenue.toLocaleString()}원
                </Text>
                <Text style={styles.statLabel}>총 수익</Text>
              </View>
            </View>
          )}
        </View>

        {/* 소셜 채널 */}
        {channels.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>연결된 채널</Text>
            {channels.map((ch) => (
              <View key={ch.id} style={styles.channelCard}>
                <View style={styles.ytBadge}>
                  <Text style={styles.ytBadgeText}>▶</Text>
                </View>
                <View style={styles.channelInfo}>
                  <Text style={styles.channelName}>{ch.channel_name}</Text>
                  <Text style={styles.channelSub}>
                    구독자 {formatCount(ch.subscriber_count)} · 조회수 {formatCount(ch.view_count)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* 계정 관리 */}
        <Text style={styles.sectionTitle}>계정</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              Alert.alert('비밀번호 변경', `${userEmail}로 비밀번호 재설정 메일을 보내드릴까요?`, [
                { text: '취소', style: 'cancel' },
                {
                  text: '보내기',
                  onPress: () =>
                    supabase.auth.resetPasswordForEmail(userEmail).then(() =>
                      Alert.alert('발송 완료', '이메일을 확인해주세요.')
                    ),
                },
              ]);
            }}
          >
            <Text style={styles.menuIcon}>🔒</Text>
            <Text style={styles.menuLabel}>비밀번호 변경</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              Alert.alert('계정 탈퇴', '모든 데이터가 삭제됩니다. 정말 탈퇴하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                {
                  text: '탈퇴', style: 'destructive',
                  onPress: () => {
                    Alert.alert('마지막 확인', '되돌릴 수 없습니다. 계속하시겠습니까?', [
                      { text: '취소', style: 'cancel' },
                      {
                        text: '영구 삭제', style: 'destructive',
                        onPress: async () => {
                          if (!user?.id) return;
                          try {
                            await Promise.all([
                              supabase.from('deals').delete().eq('user_id', user.id),
                              supabase.from('revenue').delete().eq('user_id', user.id),
                              supabase.from('media_kits').delete().eq('user_id', user.id),
                              supabase.from('social_channels').delete().eq('user_id', user.id),
                              supabase.from('schedules').delete().eq('user_id', user.id),
                            ]);
                            await AsyncStorage.multiRemove([
                              'revenue_goal', 'creator_platform',
                              'creator_scale', 'onboarding_complete',
                            ]);
                            await supabase.auth.signOut();
                          } catch {
                            Alert.alert('오류', '탈퇴 처리 중 문제가 발생했습니다. 다시 시도해주세요.');
                          }
                        },
                      },
                    ]);
                  },
                },
              ]);
            }}
          >
            <Text style={styles.menuIcon}>🚪</Text>
            <Text style={[styles.menuLabel, { color: '#EF4444' }]}>계정 탈퇴</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <EditProfileModal
        visible={showEdit}
        currentName={displayName}
        onClose={() => setShowEdit(false)}
        onSuccess={(newName) => {
          setDisplayName(newName);
          setShowEdit(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:   { fontSize: 28, color: '#374151', lineHeight: 32 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  editBtn:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F0EFFE' },
  editBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  scroll: { paddingHorizontal: 20 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  name:   { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  email:  { fontSize: 13, color: '#9CA3AF' },
  joined: { fontSize: 12, color: '#C4C4C4' },
  planBadge: { marginTop: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  planBadgeText: { fontSize: 13, fontWeight: '700' },
  statsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statsRow:    { flexDirection: 'row', justifyContent: 'space-around' },
  statItem:    { alignItems: 'center', gap: 4 },
  statValue:   { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  statLabel:   { fontSize: 12, color: '#9CA3AF' },
  statDivider: { width: 1, backgroundColor: '#F3F4F6' },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginBottom: 8, marginLeft: 4,
  },
  channelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  ytBadge:     { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FF0000', alignItems: 'center', justifyContent: 'center' },
  ytBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  channelInfo: { flex: 1 },
  channelName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  channelSub:  { fontSize: 12, color: '#9CA3AF' },
  menuCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  menuRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 56 },
  menuIcon:    { fontSize: 18, width: 28, textAlign: 'center' },
  menuLabel:   { flex: 1, fontSize: 15, fontWeight: '500', color: '#1A1A2E' },
  menuArrow:   { fontSize: 20, color: '#D1D5DB' },
});
