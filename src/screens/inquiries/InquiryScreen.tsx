import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';
import { tokens } from '../../constants/tokens';
import { typography } from '../../constants/typography';
import { shadows } from '../../constants/shadows';
import InquiryDetailModal, { InquiryItem } from './InquiryDetailModal';

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function InquiryCard({ inquiry, onPress }: { inquiry: InquiryItem; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[card.wrapper, !inquiry.is_read && card.unread]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={card.row}>
        <View style={[card.avatar, !inquiry.is_read && card.avatarUnread]}>
          <Text style={[card.avatarText, !inquiry.is_read && card.avatarTextUnread]}>
            {inquiry.brand_name.charAt(0)}
          </Text>
        </View>
        <View style={card.content}>
          <View style={card.topRow}>
            <View style={card.nameRow}>
              <Text style={[card.brandName, !inquiry.is_read && card.brandNameUnread]}>
                {inquiry.brand_name}
              </Text>
              {!inquiry.is_read && (
                <View style={card.newBadge}>
                  <Text style={card.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            <Text style={card.time}>{formatRelative(inquiry.created_at)}</Text>
          </View>
          {inquiry.budget != null && (
            <Text style={card.budget}>
              예산 {inquiry.budget.toLocaleString('ko-KR')}원
            </Text>
          )}
          {inquiry.proposal ? (
            <Text style={card.preview} numberOfLines={2}>{inquiry.proposal}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    ...shadows.card,
  },
  unread: {
    borderLeftWidth: 3, borderLeftColor: tokens.primary,
    backgroundColor: tokens.primarySofter,
  },
  row:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: tokens.primarySoft, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarUnread:     { backgroundColor: tokens.primary },
  avatarText:       { fontSize: 18, fontWeight: '800', color: tokens.primary },
  avatarTextUnread: { color: '#fff' },
  content:  { flex: 1, gap: 3 },
  topRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandName:       { ...typography.bodyStrong, color: tokens.ink2 },
  brandNameUnread: { ...typography.bodyStrong, color: tokens.ink, fontWeight: '800' },
  newBadge:     { backgroundColor: tokens.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  newBadgeText: { ...typography.caption, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  budget:  { ...typography.cardSubtitle, fontWeight: '700', color: tokens.primary },
  preview: { ...typography.hint, color: tokens.ink4 },
  time:    { ...typography.caption, color: tokens.ink4 },
});

export default function InquiryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryItem | null>(null);

  const fetchInquiries = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }

    const { data } = await supabase
      .from('media_kit_inquiries')
      .select('*, media_kits!inner(user_id), deal_id')
      .eq('media_kits.user_id', user.id)
      .order('created_at', { ascending: false });

    setInquiries((data ?? []) as InquiryItem[]);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  async function handleOpen(inquiry: InquiryItem) {
    setSelectedInquiry(inquiry);
    if (!inquiry.is_read) {
      await supabase.from('media_kit_inquiries').update({ is_read: true }).eq('id', inquiry.id);
      setInquiries((prev) => prev.map((i) => i.id === inquiry.id ? { ...i, is_read: true } : i));
    }
  }

  const unreadCount = inquiries.filter((i) => !i.is_read).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>인바운드 문의함</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>읽지 않은 문의 {unreadCount}건</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* 상태 배너 */}
      {unreadCount > 0 ? (
        <View style={styles.urgentBanner}>
          <Text style={styles.urgentBannerIcon}>📬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.urgentBannerTitle}>
              브랜드에서 새 협찬 제안이 도착했어요
            </Text>
            <Text style={styles.urgentBannerSub}>
              {unreadCount}건의 미확인 문의가 있어요 · 지금 확인하세요
            </Text>
          </View>
          <View style={styles.urgentBannerBadge}>
            <Text style={styles.urgentBannerBadgeText}>{unreadCount}</Text>
          </View>
        </View>
      ) : inquiries.length > 0 ? (
        <View style={styles.allReadBanner}>
          <Text style={styles.allReadIcon}>✓</Text>
          <Text style={styles.allReadText}>모든 문의를 확인했어요</Text>
        </View>
      ) : (
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            미디어 키트 문의 폼을 통해 브랜드가 직접 연락한 내역입니다.
          </Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInquiries(); }} tintColor={colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 60 }} />
        ) : inquiries.length === 0 ? (
          <>
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>아직 문의가 없어요</Text>
              <Text style={styles.emptyDesc}>
                미디어 키트를 공개하고{'\n'}브랜드의 인바운드 문의를 받아보세요.
              </Text>
            </View>
          </>
        ) : (
          <>
            {inquiries.map((inquiry) => (
              <InquiryCard
                key={inquiry.id}
                inquiry={inquiry}
                onPress={() => handleOpen(inquiry)}
              />
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {selectedInquiry && user && (
        <InquiryDetailModal
          visible={!!selectedInquiry}
          inquiry={selectedInquiry}
          userId={user.id}
          onClose={() => setSelectedInquiry(null)}
          onConverted={() => {
          setSelectedInquiry(null);
          fetchInquiries();
          navigation.navigate('Main', { screen: '협찬' } as any);
        }}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: tokens.ink2, lineHeight: 32 },
  headerTitle: { ...typography.navTitle, color: tokens.ink, textAlign: 'center' },
  headerSub: { ...typography.label, color: tokens.primary, textAlign: 'center', marginTop: 2 },
  infoBanner: { marginHorizontal: 20, marginBottom: 12, backgroundColor: tokens.primarySoft, borderRadius: 12, padding: 12 },
  infoText: { ...typography.hint, color: tokens.primaryDeep },
  allReadBanner: {
    marginHorizontal: 20, marginBottom: 12, backgroundColor: '#F0FDF4',
    borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  allReadIcon: { fontSize: 14, color: '#059669', fontWeight: '800' },
  allReadText: { fontSize: 12, color: '#059669', fontWeight: '600' },
  urgentBanner: {
    marginHorizontal: 20, marginBottom: 12, backgroundColor: '#EDE9FE',
    borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#C4B5FD',
  },
  urgentBannerIcon:      { fontSize: 22 },
  urgentBannerTitle:     { ...typography.bodyStrong, fontWeight: '800', color: tokens.ink, marginBottom: 2 },
  urgentBannerSub:       { ...typography.caption, color: tokens.primary },
  urgentBannerBadge:     { backgroundColor: tokens.primary, borderRadius: 12, minWidth: 26, height: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  urgentBannerBadgeText: { ...typography.cardSubtitle, fontWeight: '800', color: '#fff' },
  scroll: { paddingHorizontal: 20 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.sectionTitle, color: tokens.ink },
  emptyDesc: { ...typography.metadata, color: tokens.ink4, textAlign: 'center', lineHeight: 20 },
});
