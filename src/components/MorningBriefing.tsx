import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MorningBriefing as BriefingData, BriefingMode } from '../types/autonomous';
import { shadows } from '../constants/shadows';

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODE: Record<BriefingMode, { icon: string; label: string; bg: string; textColor: string; border: string; dotColor: string }> = {
  critical: { icon: '⚠️', label: '즉시 처리 필요', bg: '#FEF2F2', textColor: '#B91C1C', border: '#FCA5A5', dotColor: '#EF4444' },
  stable:   { icon: '✅', label: '운영 안정',       bg: '#F0FDF4', textColor: '#166534', border: '#86EFAC', dotColor: '#22C55E' },
  growth:   { icon: '🚀', label: '성장 모드',        bg: '#EFF6FF', textColor: '#1D4ED8', border: '#93C5FD', dotColor: '#3B82F6' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityRow({
  text, urgency, navigateTo, onPress,
}: {
  text: string;
  urgency: 'critical' | 'normal';
  navigateTo?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[prow.wrap, urgency === 'critical' && prow.critical]}
      onPress={onPress}
      activeOpacity={navigateTo ? 0.75 : 1}
      disabled={!navigateTo}
    >
      <View style={[prow.dot, urgency === 'critical' && prow.dotCritical]} />
      <Text style={[prow.text, urgency === 'critical' && prow.textCritical]} numberOfLines={2}>
        {text}
      </Text>
      {navigateTo && <Text style={prow.arrow}>›</Text>}
    </TouchableOpacity>
  );
}

const prow = StyleSheet.create({
  wrap:         { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  critical:     {},
  dot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB', flexShrink: 0 },
  dotCritical:  { backgroundColor: '#EF4444' },
  text:         { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
  textCritical: { fontWeight: '700', color: '#1A1A2E' },
  arrow:        { fontSize: 18, color: '#9CA3AF', flexShrink: 0 },
});

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  briefing: BriefingData;
  healthScore?: number;
  onNavigate: (target: string) => void;
}

export function MorningBriefing({ briefing, healthScore, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cfg = MODE[briefing.mode];

  const criticalPriorities = briefing.priorities.filter((p) => p.urgency === 'critical');
  const normalPriorities   = briefing.priorities.filter((p) => p.urgency === 'normal');

  const SCORE_COLOR =
    healthScore === undefined ? '#9CA3AF' :
    healthScore >= 75 ? '#2E8C5D' :
    healthScore >= 50 ? '#C68318' :
    '#C13C3C';

  return (
    <View style={[styles.card, { borderColor: cfg.border, backgroundColor: cfg.bg }]}>
      {/* ── Header row ───────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.modeBadge, { borderColor: cfg.border }]}>
            <View style={[styles.modeDot, { backgroundColor: cfg.dotColor }]} />
            <Text style={[styles.modeLabel, { color: cfg.textColor }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {healthScore !== undefined && (
            <View style={styles.scoreWrap}>
              <Text style={[styles.scoreValue, { color: SCORE_COLOR }]}>{healthScore}</Text>
              <Text style={styles.scoreUnit}>점</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setExpanded((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.chevron, { color: cfg.textColor }]}>{expanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Headline ─────────────────────────────────────────────── */}
      <Text style={[styles.headline, { color: cfg.textColor }]}>{briefing.headline}</Text>
      <Text style={styles.subheadline}>{briefing.subheadline}</Text>

      {/* ── Critical priorities — always visible ─────────────────── */}
      {criticalPriorities.length > 0 && (
        <View style={styles.priorityBlock}>
          {criticalPriorities.slice(0, 2).map((p, i) => (
            <PriorityRow
              key={i}
              text={p.text}
              urgency="critical"
              navigateTo={p.navigateTo}
              onPress={p.navigateTo ? () => onNavigate(p.navigateTo!) : undefined}
            />
          ))}
        </View>
      )}

      {/* ── Expanded: normal priorities + risks + revenue ────────── */}
      {expanded && (
        <>
          {normalPriorities.length > 0 && (
            <View style={[styles.section, styles.sectionBorder]}>
              <Text style={styles.sectionLabel}>오늘 할 일</Text>
              {normalPriorities.map((p, i) => (
                <PriorityRow
                  key={i}
                  text={p.text}
                  urgency="normal"
                  navigateTo={p.navigateTo}
                  onPress={p.navigateTo ? () => onNavigate(p.navigateTo!) : undefined}
                />
              ))}
            </View>
          )}

          {briefing.risks.length > 0 && (
            <View style={[styles.section, styles.sectionBorder]}>
              <Text style={styles.sectionLabel}>리스크</Text>
              {briefing.risks.map((r, i) => (
                <View key={i} style={styles.riskRow}>
                  <Text style={styles.riskIcon}>{r.severity === 'high' ? '🔴' : '🟡'}</Text>
                  <Text style={styles.riskText}>{r.description}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.section, styles.sectionBorder]}>
            <Text style={styles.revenueText}>{briefing.revenueInsight}</Text>
          </View>

          {briefing.brandAlert && (
            <View style={styles.brandAlertRow}>
              <Text style={styles.brandAlertText}>💡 {briefing.brandAlert}</Text>
            </View>
          )}
        </>
      )}

      {/* ── Expand hint when there's more to show ────────────────── */}
      {!expanded && (normalPriorities.length > 0 || briefing.risks.length > 0) && (
        <TouchableOpacity onPress={() => setExpanded(true)} style={styles.expandHint} activeOpacity={0.7}>
          <Text style={[styles.expandHintText, { color: cfg.textColor }]}>
            리스크 {briefing.risks.length}건 · 수익 현황 보기
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 18, padding: 16, marginBottom: 20,
    borderWidth: 1.5, ...shadows.card,
  },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerLeft: { flex: 1 },
  headerRight:{ flexDirection: 'row', alignItems: 'center', gap: 10 },

  modeBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
  modeDot:    { width: 7, height: 7, borderRadius: 4 },
  modeLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  scoreWrap:  { alignItems: 'flex-end' },
  scoreValue: { fontSize: 22, fontWeight: '900', lineHeight: 24 },
  scoreUnit:  { fontSize: 9, color: '#9CA3AF', fontWeight: '600' },
  chevron:    { fontSize: 11, fontWeight: '700' },

  headline:    { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 3, lineHeight: 22 },
  subheadline: { fontSize: 12, color: '#6B7280', marginBottom: 10 },

  priorityBlock: { gap: 2 },

  section:       { paddingTop: 10, gap: 4 },
  sectionBorder: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', marginTop: 8 },
  sectionLabel:  { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },

  riskRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 3 },
  riskIcon: { fontSize: 12, lineHeight: 20 },
  riskText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 },

  revenueText:   { fontSize: 13, fontWeight: '600', color: '#374151' },
  brandAlertRow: { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: 10 },
  brandAlertText:{ fontSize: 12, color: '#374151', lineHeight: 18 },

  expandHint:     { marginTop: 10, alignSelf: 'flex-start' },
  expandHintText: { fontSize: 11, fontWeight: '600' },
});
