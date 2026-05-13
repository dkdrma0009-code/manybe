import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { shareCsv, toCsvRow } from '../../utils/exportCsv';

// ─── 내보내기 항목 정의 ──────────────────────────────────────

interface ExportOption {
  id: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
  bg: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'deals',
    icon: '🤝',
    title: '협찬 내역 전체',
    desc: '브랜드명, 제목, 금액, 상태, 마감일 포함',
    color: '#6C63FF',
    bg: '#EDE9FE',
  },
  {
    id: 'deals_completed',
    icon: '✅',
    title: '계약 완료 협찬',
    desc: '계약완료 상태의 협찬만 필터링',
    color: '#059669',
    bg: '#D1FAE5',
  },
  {
    id: 'revenue',
    icon: '💰',
    title: '수익 내역 전체',
    desc: '날짜, 카테고리, 내용, 금액 포함',
    color: '#D97706',
    bg: '#FEF3C7',
  },
  {
    id: 'revenue_month',
    icon: '📅',
    title: '이번 달 수익',
    desc: `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 수익만 내보내기`,
    color: '#2563EB',
    bg: '#DBEAFE',
  },
];

const STATUS_LABEL: Record<string, string> = {
  pending: '검토중', in_progress: '협상중', completed: '계약완료', cancelled: '취소됨',
};
const CATEGORY_LABEL: Record<string, string> = {
  platform: '플랫폼 광고', sponsorship: '브랜드 협찬', affiliate: '제휴 수익', other: '기타',
};

// ─── 내보내기 함수들 ─────────────────────────────────────────

async function exportDeals(userId: string, completedOnly: boolean) {
  const query = supabase
    .from('deals')
    .select('brand, title, amount, status, end_date, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (completedOnly) query.eq('status', 'completed');

  const { data, error } = await query;
  if (error) throw error;

  const header = toCsvRow(['브랜드', '제목', '금액(원)', '상태', '마감일', '등록일']);
  const rows = (data ?? []).map((r) =>
    toCsvRow([
      r.brand,
      r.title,
      r.amount,
      STATUS_LABEL[r.status] ?? r.status,
      r.end_date ? r.end_date.slice(0, 10) : '',
      r.created_at ? r.created_at.slice(0, 10) : '',
    ])
  );

  const today = new Date().toISOString().slice(0, 10);
  const filename = completedOnly
    ? `매니비_계약완료_${today}.csv`
    : `매니비_협찬내역_${today}.csv`;

  await shareCsv(filename, [header, ...rows]);
}

async function exportRevenue(userId: string, thisMonthOnly: boolean) {
  const query = supabase
    .from('revenues')
    .select('date, category, description, amount')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (thisMonthOnly) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    query.gte('date', start).lte('date', end);
  }

  const { data, error } = await query;
  if (error) throw error;

  const header = toCsvRow(['날짜', '유형', '내용', '금액(원)', '예상세금(원)', '실수령(원)']);
  const rows = (data ?? []).map((r) => {
    const tax = Math.round(r.amount * 0.033);
    return toCsvRow([
      r.date,
      CATEGORY_LABEL[r.category] ?? r.category,
      r.description ?? '',
      r.amount,
      tax,
      r.amount - tax,
    ]);
  });

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const filename = thisMonthOnly
    ? `매니비_${now.getFullYear()}년${now.getMonth() + 1}월수익_${today}.csv`
    : `매니비_수익내역_${today}.csv`;

  await shareCsv(filename, [header, ...rows]);
}

// ─── 메인 화면 ──────────────────────────────────────────────

export default function AEExportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleExport(optionId: string) {
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    setLoading(optionId);
    try {
      if (optionId === 'deals') await exportDeals(user.id, false);
      else if (optionId === 'deals_completed') await exportDeals(user.id, true);
      else if (optionId === 'revenue') await exportRevenue(user.id, false);
      else if (optionId === 'revenue_month') await exportRevenue(user.id, true);
    } catch (e: any) {
      Alert.alert('내보내기 실패', e.message ?? '다시 시도해주세요.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AE 모드</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* 안내 배너 */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>📊</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>CSV 내보내기</Text>
            <Text style={styles.bannerDesc}>
              데이터를 엑셀/구글 시트에서 열 수 있는 CSV 파일로 내보냅니다.
            </Text>
          </View>
        </View>

        {/* 내보내기 옵션 */}
        {EXPORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.optionCard, loading === opt.id && { opacity: 0.7 }]}
            onPress={() => handleExport(opt.id)}
            activeOpacity={0.82}
            disabled={loading !== null}
          >
            <View style={[styles.optionIcon, { backgroundColor: opt.bg }]}>
              <Text style={styles.optionIconText}>{opt.icon}</Text>
            </View>
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>{opt.title}</Text>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </View>
            {loading === opt.id
              ? <ActivityIndicator color={opt.color} size="small" />
              : <Text style={[styles.optionArrow, { color: opt.color }]}>↓</Text>
            }
          </TouchableOpacity>
        ))}

        {/* 사용 팁 */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 사용 팁</Text>
          <Text style={styles.tipText}>• 엑셀에서 파일을 열면 한국어가 깨지지 않습니다 (BOM 포함)</Text>
          <Text style={styles.tipText}>• 구글 시트에 바로 붙여넣기도 가능합니다</Text>
          <Text style={styles.tipText}>• 협찬 내역은 브랜드 제안서에 바로 활용하세요</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: '#374151', lineHeight: 32 },
  title:     { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  scroll:    { paddingHorizontal: 20 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1A1A2E', borderRadius: 16,
    padding: 18, marginBottom: 20,
  },
  bannerIcon:  { fontSize: 32 },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 4 },
  bannerDesc:  { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 17 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  optionIcon:     { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionIconText: { fontSize: 22 },
  optionBody:     { flex: 1 },
  optionTitle:    { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 3 },
  optionDesc:     { fontSize: 12, color: '#9CA3AF' },
  optionArrow:    { fontSize: 20, fontWeight: '700' },
  tipCard: {
    backgroundColor: '#F0EFFE', borderRadius: 14, padding: 16, gap: 6, marginTop: 4,
  },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#6C63FF', marginBottom: 4 },
  tipText:  { fontSize: 12, color: '#7C6FCD', lineHeight: 18 },
});