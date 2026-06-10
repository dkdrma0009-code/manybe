import { Text } from '@/components/Text';
import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useBrandHistory } from '../hooks/useBrandHistory';

interface Props {
  userId: string | undefined;
  brand: string;
  onViewAll?: () => void;
}

const LEVEL_CONFIG = {
  new:       { icon: '🌱', color: '#2E8C5D', bg: '#DEEFE5' },
  returning: { icon: '🔄', color: '#3B6FD9', bg: '#E3ECFB' },
  frequent:  { icon: '⭐', color: '#C68318', bg: '#FBF1DC' },
};

export function BrandHistoryCard({ userId, brand, onViewAll }: Props) {
  const { stats, loading } = useBrandHistory(userId, brand);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#6E56F0" />
      </View>
    );
  }

  if (!stats || stats.totalCount === 0) return null;

  const level = LEVEL_CONFIG[stats.relationshipLevel];

  const insight = (() => {
    if (stats.totalCount === 1) return '이 브랜드와의 첫 번째 협업이에요';
    if (stats.totalCount === 2) return '이 브랜드와 두 번째 협업이에요';
    if (stats.totalCount >= 3) return `이 브랜드와 ${stats.totalCount}번째 협업이에요`;
    return null;
  })();

  const formattedLastDate = stats.lastDealDate
    ? new Date(stats.lastDealDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: level.bg }]}>
          <Text style={styles.badgeIcon}>{level.icon}</Text>
          <Text style={[styles.badgeText, { color: level.color }]}>{stats.relationshipLabel}</Text>
        </View>
        {stats.hasStaleUploaded && (
          <View style={styles.riskBadge}>
            <Text style={styles.riskText}>⚠️ 정산 지연 위험</Text>
          </View>
        )}
      </View>

      {insight && (
        <Text style={styles.insight}>{insight}</Text>
      )}

      <View style={styles.statsRow}>
        <StatBox label="총 협업" value={`${stats.totalCount}건`} />
        <StatBox label="총 수익" value={stats.totalEarned > 0 ? `${stats.totalEarned.toLocaleString('ko-KR')}원` : '-'} />
        <StatBox label="평균 단가" value={stats.avgAmount > 0 ? `${stats.avgAmount.toLocaleString('ko-KR')}원` : '-'} />
        <StatBox label="완료율" value={`${stats.completionRate}%`} />
      </View>

      {formattedLastDate && (
        <Text style={styles.lastDate}>최근 협업: {formattedLastDate}</Text>
      )}

      {stats.totalCount > 1 && onViewAll && (
        <TouchableOpacity style={styles.viewAllBtn} onPress={onViewAll}>
          <Text style={styles.viewAllText}>전체 기록 보기 →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F7FF',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#EAE3FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeIcon: { fontSize: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  riskBadge: {
    backgroundColor: '#FBF1DC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  riskText: { fontSize: 11, color: '#C68318', fontWeight: '500' },
  insight: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    marginHorizontal: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  lastDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  viewAllBtn: {
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  viewAllText: {
    fontSize: 13,
    color: '#6E56F0',
    fontWeight: '600',
  },
});
