import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { FocusItem } from '../services/DecisionEngine';

interface Props {
  items: FocusItem[];
  onPress: (item: FocusItem) => void;
}

const URGENCY_THEME = {
  critical: { bg: '#FBE5E5', color: '#C13C3C', border: '#F5BCBC', rankBg: '#C13C3C' },
  high:     { bg: '#FBF1DC', color: '#C68318', border: '#F5DFA0', rankBg: '#C68318' },
  medium:   { bg: '#EAE3FF', color: '#6E56F0', border: '#C4B5FD', rankBg: '#6E56F0' },
};

export function FocusCard({ items, onPress }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const topItems    = items.slice(0, 3);
  const hasCritical = topItems.some((i) => i.urgency === 'critical');

  if (topItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>지금 바로 해야 할 일</Text>
        {hasCritical && (
          <View style={styles.criticalBadge}>
            <Text style={styles.criticalBadgeText}>긴급</Text>
          </View>
        )}
      </View>

      {topItems.map((item, index) => {
        const theme    = URGENCY_THEME[item.urgency];
        const expanded = expandedId === item.id;

        return (
          <View key={item.id} style={[styles.itemCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            {/* Main row */}
            <View style={styles.itemRow}>
              <View style={[styles.rankBadge, { backgroundColor: theme.rankBg }]}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <View style={styles.itemBody}>
                <Text style={[styles.itemTitle, { color: theme.color }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
              </View>
              <TouchableOpacity
                style={styles.expandBtn}
                onPress={() => setExpandedId(expanded ? null : item.id)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Text style={[styles.expandIcon, { color: theme.color }]}>
                  {expanded ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Explanation panel */}
            {expanded && (
              <View style={[styles.explanationPanel, { borderTopColor: theme.border }]}>
                <View style={styles.explanationRow}>
                  <Text style={styles.explanationLabel}>왜 중요한가</Text>
                  <Text style={styles.explanationText}>{item.explanation}</Text>
                </View>
                <View style={styles.explanationRow}>
                  <Text style={styles.explanationLabel}>근거 데이터</Text>
                  <Text style={styles.explanationText}>{item.dataReason}</Text>
                </View>
                <View style={styles.explanationRow}>
                  <Text style={styles.explanationLabel}>기대 효과</Text>
                  <Text style={styles.explanationText}>{item.expectedOutcome}</Text>
                </View>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: theme.color }]}
              onPress={() => onPress(item)}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>{item.cta} →</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { marginBottom: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  headerTitle:       { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  criticalBadge:     { backgroundColor: '#C13C3C', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  criticalBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  itemCard: {
    borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, gap: 0,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },

  rankBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankText:  { fontSize: 11, fontWeight: '900', color: '#fff' },
  itemIcon:  { fontSize: 16, width: 22, textAlign: 'center' },

  itemBody:     { flex: 1, minWidth: 0 },
  itemTitle:    { fontSize: 13, fontWeight: '700', marginBottom: 1 },
  itemSubtitle: { fontSize: 11, color: '#6B7280' },

  expandBtn:  { padding: 2 },
  expandIcon: { fontSize: 10, fontWeight: '700' },

  explanationPanel: {
    borderTopWidth: 1, paddingTop: 10, marginTop: 4, gap: 8, marginBottom: 10,
  },
  explanationRow:   { gap: 2 },
  explanationLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  explanationText:  { fontSize: 12, color: '#374151', lineHeight: 17 },

  cta: {
    borderRadius: 8, paddingVertical: 8, alignItems: 'center',
  },
  ctaText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
