import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { usePlan } from '../../hooks/usePlan';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';
import FomoBanner from '../../components/FomoBanner';
import PremiumPaywallModal from '../../components/PremiumPaywallModal';
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
        <View style={card.avatar}>
          <Text style={card.avatarText}>{inquiry.brand_name.charAt(0)}</Text>
        </View>
        <View style={card.content}>
          <View style={card.topRow}>
            <Text style={[card.brandName, !inquiry.is_read && card.brandNameUnread]}>
              {inquiry.brand_name}
            </Text>
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
        {!inquiry.is_read && <View style={card.dot} />}
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  unread: {
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  content: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandName: { fontSize: 14, fontWeight: '700', color: '#374151' },
  brandNameUnread: { color: '#1A1A2E', fontWeight: '800' },
  budget: { fontSize: 13, fontWeight: '700', color: colors.primary },
  preview: { fontSize: 12, color: '#9CA3AF', lineHeight: 18 },
  time: { fontSize: 11, color: '#C4C4C4' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4, flexShrink: 0 },
});

export default function InquiryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isPremium } = usePlan(user?.id);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryItem | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const fetchInquiries = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }

    const { data } = await supabase
      .from('media_kit_inquiries')
      .select('*, media_kits!inner(user_id)')
      .eq('media_kits.user_id', user.id)
      .order('created_at', { ascending: false });

    setInquiries((data ?? []) as InquiryItem[]);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  async function handleOpen(inquiry: InquiryItem) {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
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

      {/* 안내 배너 */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          📬 미디어 키트 페이지의 문의 폼을 통해 브랜드가 직접 연락한 내역입니다.
        </Text>
      </View>

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
            {!isPremium && <FomoBanner variant="deals" />}
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
            {!isPremium && <FomoBanner variant="deals" />}
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
          onConverted={() => { setSelectedInquiry(null); fetchInquiries(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: '#374151', lineHeight: 32 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' },
  headerSub: { fontSize: 12, color: colors.primary, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  infoBanner: { marginHorizontal: 20, marginBottom: 12, backgroundColor: '#F0EFFE', borderRadius: 12, padding: 12 },
  infoText: { fontSize: 12, color: '#7C6FCD', lineHeight: 18 },
  scroll: { paddingHorizontal: 20 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});
