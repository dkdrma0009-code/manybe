import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type SearchType = 'all' | 'revenue' | 'deal' | 'schedule';

interface SearchResult {
  id: string;
  type: Exclude<SearchType, 'all'>;
  title: string;
  subtitle: string;
  amount?: number;
  date?: string;
}

const TABS: { key: SearchType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'revenue', label: '수익' },
  { key: 'deal', label: '협찬' },
  { key: 'schedule', label: '일정' },
];

const TYPE_META: Record<Exclude<SearchType, 'all'>, { label: string; icon: string; color: string; bg: string }> = {
  revenue: { label: '수익', icon: '💰', color: '#059669', bg: '#D1FAE5' },
  deal: { label: '협찬', icon: '🤝', color: '#7C3AED', bg: '#EDE9FE' },
  schedule: { label: '일정', icon: '📅', color: '#2563EB', bg: '#DBEAFE' },
};

function formatAmount(amount?: number) {
  if (amount == null) return '';
  return `${amount.toLocaleString('ko-KR')}원`;
}

function formatDate(date?: string) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function normalizeKeyword(keyword: string) {
  return keyword.trim().replace(/[,%]/g, '');
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<SearchType>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const visibleResults = useMemo(() => {
    if (activeTab === 'all') return results;
    return results.filter((item) => item.type === activeTab);
  }, [activeTab, results]);

  useEffect(() => {
    const term = normalizeKeyword(keyword);
    if (!term || term.length < 2 || !user?.id) {
      setResults([]);
      setSearched(term.length >= 2);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearched(true);

      const pattern = `%${term}%`;
      const [revenueRes, dealsRes, schedulesRes] = await Promise.all([
        supabase
          .from('revenues')
          .select('id, amount, category, description, date')
          .eq('user_id', user.id)
          .or(`description.ilike.${pattern},category.ilike.${pattern}`)
          .order('date', { ascending: false })
          .limit(20),
        supabase
          .from('deals')
          .select('id, brand, title, amount, status, end_date')
          .eq('user_id', user.id)
          .or(`brand.ilike.${pattern},title.ilike.${pattern},status.ilike.${pattern}`)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('schedules')
          .select('id, title, description, type, start_time')
          .eq('user_id', user.id)
          .or(`title.ilike.${pattern},description.ilike.${pattern},type.ilike.${pattern}`)
          .order('start_time', { ascending: false })
          .limit(20),
      ]);

      if (cancelled) return;

      const nextResults: SearchResult[] = [
        ...((revenueRes.data ?? []).map((row) => ({
          id: row.id,
          type: 'revenue' as const,
          title: row.description || '수익 내역',
          subtitle: `${row.category ?? '기타'} · ${formatDate(row.date)}`,
          amount: row.amount,
          date: row.date,
        }))),
        ...((dealsRes.data ?? []).map((row) => ({
          id: row.id,
          type: 'deal' as const,
          title: row.title || row.brand || '협찬',
          subtitle: `${row.brand ?? '브랜드'} · ${row.status ?? '상태 없음'}${row.end_date ? ` · ${formatDate(row.end_date)}` : ''}`,
          amount: row.amount,
          date: row.end_date,
        }))),
        ...((schedulesRes.data ?? []).map((row) => ({
          id: row.id,
          type: 'schedule' as const,
          title: row.title || '일정',
          subtitle: `${row.type ?? '기타'} · ${formatDate(row.start_time)}`,
          date: row.start_time,
        }))),
      ];

      setResults(nextResults);
      setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword, user?.id]);

  function openResult(result: SearchResult) {
    const screen = result.type === 'revenue' ? '수익' : result.type === 'deal' ? '협찬' : '캘린더';
    navigation.navigate('Main', { screen });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>전체 검색</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔎</Text>
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          placeholder="수익, 협찬, 일정을 검색하세요"
          placeholderTextColor="#A1A1AA"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {keyword.length > 0 && (
          <TouchableOpacity onPress={() => setKeyword('')} style={styles.clearBtn} activeOpacity={0.75}>
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = tab.key === 'all' ? results.length : results.filter((item) => item.type === tab.key).length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label} {count > 0 ? count : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.results}>
        {keyword.trim().length < 2 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>두 글자 이상 입력해보세요</Text>
            <Text style={styles.emptyDesc}>수익 설명, 브랜드명, 협찬 제목, 일정명을 한 번에 찾습니다.</Text>
          </View>
        ) : loading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 60 }} />
        ) : searched && visibleResults.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗂️</Text>
            <Text style={styles.emptyTitle}>검색 결과가 없습니다</Text>
            <Text style={styles.emptyDesc}>다른 키워드로 다시 검색해보세요.</Text>
          </View>
        ) : (
          visibleResults.map((result) => {
            const meta = TYPE_META[result.type];
            return (
              <TouchableOpacity
                key={`${result.type}-${result.id}`}
                style={styles.resultCard}
                onPress={() => openResult(result)}
                activeOpacity={0.82}
              >
                <View style={[styles.typeIcon, { backgroundColor: meta.bg }]}>
                  <Text style={styles.typeIconText}>{meta.icon}</Text>
                </View>
                <View style={styles.resultBody}>
                  <View style={styles.resultTop}>
                    <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
                    {result.date && <Text style={styles.resultDate}>{formatDate(result.date)}</Text>}
                  </View>
                  <Text style={styles.resultTitle} numberOfLines={1}>{result.title}</Text>
                  <Text style={styles.resultSub} numberOfLines={1}>{result.subtitle}</Text>
                </View>
                {result.amount != null && <Text style={styles.amount}>{formatAmount(result.amount)}</Text>}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, color: '#374151', lineHeight: 36 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  searchWrap: {
    marginHorizontal: 20,
    marginBottom: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '600' },
  clearBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  clearText: { fontSize: 20, color: '#9CA3AF', lineHeight: 22 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  results: { paddingHorizontal: 20, paddingBottom: 32 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  typeIconText: { fontSize: 19 },
  resultBody: { flex: 1, gap: 2 },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeLabel: { fontSize: 11, fontWeight: '800' },
  resultDate: { fontSize: 11, color: '#A1A1AA' },
  resultTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  resultSub: { fontSize: 12, color: colors.textSecondary },
  amount: { fontSize: 13, fontWeight: '800', color: colors.primary },
  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 42, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', lineHeight: 20, textAlign: 'center' },
});
