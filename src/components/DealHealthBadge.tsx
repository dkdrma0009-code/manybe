import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DealHealthResult } from '../utils/dealHealth';

interface Props {
  health: DealHealthResult;
  showInsights?: boolean;
}

export function DealHealthBadge({ health, showInsights = false }: Props) {
  return (
    <View>
      <View style={[styles.badge, { backgroundColor: health.bg }]}>
        <Text style={styles.emoji}>{health.emoji}</Text>
        <Text style={[styles.label, { color: health.color }]}>{health.label}</Text>
      </View>

      {showInsights && health.insights.length > 0 && (
        <View style={[styles.insightsBox, { borderColor: health.color + '40' }]}>
          {health.insights.map((text, i) => (
            <View key={i} style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: health.color }]} />
              <Text style={[styles.insightText, { color: health.color }]}>{text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  emoji: { fontSize: 12 },
  label: { fontSize: 12, fontWeight: '700' },
  insightsBox: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  insightDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  insightText: { fontSize: 12, lineHeight: 18, flex: 1, fontWeight: '500' },
});
