import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useBrandHistory } from '../../hooks/useBrandHistory';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'BrandDetail'>;

const STATUS_LABEL: Record<string, string> = {
  inquiry:     '문의',
  reviewing:   '검토중',
  in_progress: '진행중',
  uploaded:    '업로드됨',
  settled:     '정산완료',
};

const STATUS_COLOR: Record<string, string> = {
  inquiry:     '#6B7280',
  reviewing:   '#3B6FD9',
  in_progress: '#C68318',
  uploaded:    '#6E56F0',
  settled:     '#2E8C5D',
};

const LEVEL_CONFIG = {
  new:       { icon: '🌱', color: '#2E8C5D', bg: '#DEEFE5' },
  returning: { icon: '🔄', color: '#3B6FD9', bg: '#E3ECFB' },
  frequent:  { icon: '⭐', color: '#C68318', bg: '#FBF1DC' },
};

export default function BrandDetailScreen({ route, navigation }: Props) {
  const { brand } = route.params;
  const { user } = useAuth();
  const { stats, loading } = useBrandHistory(user?.id, brand);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{brand}</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6E56F0" />
        </View>
      ) : !stats || stats.totalCount === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>협업 기록이 없어요</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Relationship badge */}
          <View style={styles.section}>
            {(() => {
              const level = LEVEL_CONFIG[stats.relationshipLevel];
              return (
                <View style={[styles.levelBadge, { backgroundColor: level.bg }]}>
                  <Text style={styles.levelIcon}>{level.icon}</Text>
                  <Text style={[styles.levelLabel, { color: level.color }]}>{stats.relationshipLabel}</Text>
                </View>
              );
            })()}
            {stats.hasStaleUploaded && (
              <View style={styles.riskRow}>
                <Text style={styles.riskText}>⚠️ 업로드 후 45일 이상 정산이 지연된 협찬이 있어요</Text>
              </View>
            )}
          </View>

          {/* Summary stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>협업 요약</Text>
            <View style={styles.statsGrid}>
              <SummaryBox label="총 협업" value={`${stats.totalCount}건`} />
              <SummaryBox label="정산 완료" value={`${stats.settledCount}건`} />
              <SummaryBox label="총 수익" value={stats.totalEarned > 0 ? `${stats.totalEarned.toLocaleString('ko-KR')}원` : '-'} />
              <SummaryBox label="평균 단가" value={stats.avgAmount > 0 ? `${stats.avgAmount.toLocaleString('ko-KR')}원` : '-'} />
              <SummaryBox label="완료율" value={`${stats.completionRate}%`} />
              {stats.lastDealDate && (
                <SummaryBox
                  label="최근 협업"
                  value={new Date(stats.lastDealDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                />
              )}
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>협업 타임라인</Text>
            {stats.deals.map((deal, idx) => (
              <View key={deal.id} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                {idx < stats.deals.length - 1 && <View style={styles.timelineLine} />}
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineTitle}>{deal.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[deal.status]}18` }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLOR[deal.status] }]}>
                        {STATUS_LABEL[deal.status] ?? deal.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.timelineAmount}>
                    {deal.amount > 0 ? `${deal.amount.toLocaleString('ko-KR')}원` : '금액 미정'}
                  </Text>
                  <Text style={styles.timelineDate}>
                    {new Date(deal.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 60 },
  backText: { fontSize: 17, color: '#6E56F0' },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
  content: { padding: 16, gap: 8 },
  section: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  levelIcon: { fontSize: 16 },
  levelLabel: { fontSize: 14, fontWeight: '700' },
  riskRow: {
    marginTop: 10,
    backgroundColor: '#FBF1DC',
    borderRadius: 8,
    padding: 10,
  },
  riskText: { fontSize: 12, color: '#C68318', fontWeight: '500' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryBox: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  summaryLabel: { fontSize: 10, color: '#9CA3AF' },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6E56F0',
    marginTop: 4,
    marginRight: 12,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 4,
    top: 14,
    width: 2,
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  timelineContent: { flex: 1 },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', flex: 1, marginRight: 8 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  timelineAmount: { fontSize: 13, color: '#374151', marginBottom: 2 },
  timelineDate: { fontSize: 11, color: '#9CA3AF' },
});
