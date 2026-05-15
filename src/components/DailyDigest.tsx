import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { OperationalSnapshot, DailyDigestItem } from '../hooks/useOperationalContext';

interface Props {
  snapshot: OperationalSnapshot;
  onNavigate: (target: string) => void;
}

function formatWon(n: number): string {
  if (n >= 100_000_000) return `${Math.floor(n / 100_000_000)}억원`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만원`;
  return n.toLocaleString('ko-KR') + '원';
}

export function DailyDigest({ snapshot, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? snapshot.digest : snapshot.digest.slice(0, 3);

  const urgentCount = snapshot.digest.filter(
    (d) => d.severity === 'critical' || d.severity === 'warning',
  ).length;

  const SCORE_COLOR =
    snapshot.healthScore >= 75 ? '#2E8C5D' :
    snapshot.healthScore >= 50 ? '#C68318' :
    '#C13C3C';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>오늘의 브리핑</Text>
          {urgentCount > 0 && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>{urgentCount}건 주의</Text>
            </View>
          )}
        </View>
        <View style={styles.scoreWrap}>
          <Text style={[styles.scoreValue, { color: SCORE_COLOR }]}>
            {snapshot.healthScore}
          </Text>
          <Text style={styles.scoreLabel}>운영점수</Text>
        </View>
      </View>

      {/* Digest rows */}
      {displayItems.map((item, i) => (
        <DigestRow
          key={i}
          item={item}
          onPress={item.navigateTo ? () => onNavigate(item.navigateTo!) : undefined}
        />
      ))}

      {snapshot.digest.length > 3 && (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={styles.expandBtn} activeOpacity={0.7}>
          <Text style={styles.expandText}>
            {expanded ? '접기' : `${snapshot.digest.length - 3}개 더 보기`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Revenue forecast */}
      {snapshot.forecast && snapshot.forecast.confidence !== 'low' && (
        <View style={styles.forecastRow}>
          <Text style={styles.forecastLabel}>이번 달 예상 수익</Text>
          <View style={styles.forecastRight}>
            <Text style={styles.forecastValue}>
              {formatWon(snapshot.forecast.thisMonthExpected)}
            </Text>
            <Text style={[
              styles.forecastTrend,
              snapshot.forecast.trend === 'up'   ? styles.trendUp :
              snapshot.forecast.trend === 'down' ? styles.trendDown :
              styles.trendFlat,
            ]}>
              {snapshot.forecast.trend === 'up' ? '▲' : snapshot.forecast.trend === 'down' ? '▼' : '—'}
            </Text>
          </View>
        </View>
      )}

      {/* Top opportunity teaser */}
      {snapshot.opportunities.length > 0 && (
        <TouchableOpacity
          style={styles.oppRow}
          onPress={() => onNavigate('deals')}
          activeOpacity={0.8}
        >
          <Text style={styles.oppIcon}>🤝</Text>
          <Text style={styles.oppText} numberOfLines={1}>
            {snapshot.opportunities[0].title}
          </Text>
          <Text style={styles.oppArrow}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DigestRow({ item, onPress }: { item: DailyDigestItem; onPress?: () => void }) {
  const COLORS = { critical: '#C13C3C', warning: '#C68318', info: '#3B6FD9', success: '#2E8C5D' };
  const color  = COLORS[item.severity];

  return (
    <View style={styles.digestRow}>
      <Text style={styles.digestIcon}>{item.icon}</Text>
      <Text style={[styles.digestText, item.severity === 'critical' && { fontWeight: '700', color: '#374151' }]}>
        {item.text}
      </Text>
      {onPress && item.actionLabel && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          <Text style={[styles.digestAction, { color }]}>{item.actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title:      { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },

  urgentBadge:     { backgroundColor: '#FBE5E5', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  urgentBadgeText: { fontSize: 10, fontWeight: '700', color: '#C13C3C' },

  scoreWrap:  { alignItems: 'center', marginLeft: 8 },
  scoreValue: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  scoreLabel: { fontSize: 9, fontWeight: '600', color: '#9CA3AF' },

  digestRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  digestIcon:  { fontSize: 14, width: 20, textAlign: 'center' },
  digestText:  { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 },
  digestAction:{ fontSize: 11, fontWeight: '700' },

  expandBtn:  { alignSelf: 'flex-start', marginTop: 2, marginBottom: 4 },
  expandText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },

  forecastRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  forecastLabel: { fontSize: 12, color: '#6B7280' },
  forecastRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  forecastValue: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  forecastTrend: { fontSize: 12, fontWeight: '700' },
  trendUp:    { color: '#2E8C5D' },
  trendDown:  { color: '#C13C3C' },
  trendFlat:  { color: '#9CA3AF' },

  oppRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  oppIcon:  { fontSize: 14 },
  oppText:  { flex: 1, fontSize: 12, fontWeight: '600', color: '#6E56F0' },
  oppArrow: { fontSize: 18, color: '#6E56F0' },
});
