// AnalyticsScreen 프리미티브 컴포넌트 — 섹션 본문은 AnalyticsScreen.tsx에 유지.
import { Text } from '@/components/Text';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { tokens } from '../../constants/tokens';
import { trendColor } from './helpers';

export function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={pStyles.card}>{children}</View>;
}

export function SectionTitle({ title, badge, badgeColor, pro }: {
  title: string; badge?: string; badgeColor?: string; pro?: boolean;
}) {
  return (
    <View style={pStyles.sectionTitleRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={pStyles.sectionTitle}>{title}</Text>
        {pro && (
          <View style={pStyles.proBadge}>
            <Text style={pStyles.proBadgeText}>PRO</Text>
          </View>
        )}
      </View>
      {badge ? (
        <View style={[pStyles.chip, { backgroundColor: (badgeColor ?? tokens.primary) + '22' }]}>
          <Text style={[pStyles.chipText, { color: badgeColor ?? tokens.primary }]}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ProDivider() {
  return (
    <View style={pStyles.proDividerWrap}>
      <View style={pStyles.proDividerLine} />
      <View style={pStyles.proDividerChip}>
        <Text style={pStyles.proDividerText}>✦ PRO 전용</Text>
      </View>
      <View style={pStyles.proDividerLine} />
    </View>
  );
}

export function Divider() { return <View style={pStyles.divider} />; }

export function ProgressBar({ value, color = tokens.primary }: { value: number; color?: string }) {
  return (
    <View style={pStyles.progressTrack}>
      <View style={[pStyles.progressFill, {
        width: `${Math.min(Math.max(value, 0), 100)}%`, backgroundColor: color,
      }]} />
    </View>
  );
}

export function MetricRow({ label, value, sub, valueColor }: {
  label: string; value: string; sub?: string; valueColor?: string;
}) {
  return (
    <View style={pStyles.metricRow}>
      <Text style={pStyles.metricLabel}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[pStyles.metricValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
        {sub ? <Text style={pStyles.metricSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={pStyles.emptyState}>
      <Text style={pStyles.emptyText}>{message}</Text>
    </View>
  );
}

export function ScoreRing({ score, trend }: {
  score: number; trend: 'improving' | 'stable' | 'declining';
}) {
  const ringColor = score >= 70 ? tokens.uploaded : score >= 45 ? tokens.reviewing : tokens.urgent;
  const tc = trendColor(trend);
  const trendText = trend === 'improving' ? '↑ 개선 중' : trend === 'stable' ? '→ 유지 중' : '↓ 하락 중';
  return (
    <View style={pStyles.scoreRingContainer}>
      <View style={[pStyles.scoreRing, { borderColor: ringColor }]}>
        <Text style={[pStyles.scoreNumber, { color: ringColor }]}>{score}</Text>
        <Text style={pStyles.scoreMax}>/100</Text>
      </View>
      <Text style={[pStyles.scoreTrend, { color: tc }]}>{trendText}</Text>
    </View>
  );
}

export function StatBlock({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={pStyles.statBlock}>
      <Text style={[pStyles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={pStyles.statLabel}>{label}</Text>
    </View>
  );
}

export function TrendRow({ label, value, status, statusColor, icon }: {
  label: string; value: string;
  status: '개선' | '안정' | '주의' | '위험';
  statusColor: string; icon: string;
}) {
  return (
    <View style={pStyles.trendRow}>
      <Text style={pStyles.trendLabel}>{label}</Text>
      <Text style={pStyles.trendValue}>{value}</Text>
      <View style={{ flex: 1 }} />
      <View style={[pStyles.trendChip, { backgroundColor: statusColor + '22' }]}>
        <Text style={[pStyles.trendChipText, { color: statusColor }]}>{icon} {status}</Text>
      </View>
    </View>
  );
}

export function CoachItem({ icon, title, detail, color }: {
  icon: string; title: string; detail: string; color: string;
}) {
  return (
    <View style={pStyles.coachItem}>
      <Text style={pStyles.coachIcon}>{icon}</Text>
      <View style={pStyles.coachBody}>
        <Text style={[pStyles.coachTitle, { color }]}>{title}</Text>
        <Text style={pStyles.coachDetail}>{detail}</Text>
      </View>
    </View>
  );
}

// 섹션 JSX(AnalyticsScreen.tsx)에서도 chip·sectionTitle 등을 직접 쓰므로 export.
export const pStyles = StyleSheet.create({
  card: {
    backgroundColor: tokens.surface,
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, borderWidth: 1, borderColor: tokens.border, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#15131E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: tokens.ink, letterSpacing: -0.2 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: tokens.border, marginHorizontal: 16, marginVertical: 4 },

  progressTrack: { height: 4, backgroundColor: tokens.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },

  metricRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 9,
  },
  metricLabel: { fontSize: 13, color: tokens.ink3 },
  metricValue: { fontSize: 13, fontWeight: '700', color: tokens.ink },
  metricSub: { fontSize: 10, color: tokens.ink4, marginTop: 1 },

  scoreRingContainer: { alignItems: 'center', gap: 6 },
  scoreRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: 28, fontWeight: '800', letterSpacing: -1, lineHeight: 32 },
  scoreMax: { fontSize: 10, color: tokens.ink4, marginTop: -2 },
  scoreTrend: { fontSize: 11, fontWeight: '600' },

  statBlock: { flex: 1, minWidth: '40%', alignItems: 'center', padding: 12, backgroundColor: tokens.bg, borderRadius: 10 },
  statValue: { fontSize: 18, fontWeight: '800', color: tokens.ink },
  statLabel: { fontSize: 10, color: tokens.ink4, marginTop: 2 },

  trendRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  trendLabel: { fontSize: 12, color: tokens.ink3, width: 80 },
  trendValue: { fontSize: 12, fontWeight: '700', color: tokens.ink, width: 40 },
  trendChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  trendChipText: { fontSize: 11, fontWeight: '700' },

  coachItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 9, gap: 10, alignItems: 'flex-start' },
  coachIcon: { fontSize: 16, marginTop: 1, width: 22 },
  coachBody: { flex: 1 },
  coachTitle: { fontSize: 13, fontWeight: '700' },
  coachDetail: { fontSize: 12, color: tokens.ink3, marginTop: 3, lineHeight: 17 },

  emptyState: { paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center' },
  emptyText: { fontSize: 13, color: tokens.ink4, textAlign: 'center', lineHeight: 18 },

  proBadge: {
    backgroundColor: '#7C3AED', borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  proBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  proDividerWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 8, gap: 10,
  },
  proDividerLine: { flex: 1, height: 1, backgroundColor: '#7C3AED33' },
  proDividerChip: {
    backgroundColor: '#7C3AED', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  proDividerText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
});
