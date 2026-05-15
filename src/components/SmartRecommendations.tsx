import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SmartRecommendation } from '../types/automation';

interface Props {
  recommendations: SmartRecommendation[];
  onPress: (rec: SmartRecommendation) => void;
  onDismiss: (id: string) => void;
}

export function SmartRecommendations({ recommendations, onPress, onDismiss }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>스마트 제안</Text>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{recommendations.length}</Text>
        </View>
      </View>

      {recommendations.map((rec) => (
        <RecommendationCard
          key={rec.id}
          rec={rec}
          onPress={() => onPress(rec)}
          onDismiss={() => onDismiss(rec.id)}
        />
      ))}
    </View>
  );
}

function RecommendationCard({
  rec, onPress, onDismiss,
}: {
  rec: SmartRecommendation;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const THEMES = {
    critical: { bg: '#FBE5E5', color: '#C13C3C', border: '#F5BCBC' },
    high:     { bg: '#FBF1DC', color: '#C68318', border: '#F5DFA0' },
    medium:   { bg: '#EAE3FF', color: '#6E56F0', border: '#C4B5FD' },
  };
  const theme = THEMES[rec.priority];

  const TYPE_ICONS: Record<string, string> = {
    stale_deal_followup:    '⚡',
    settlement_request:     '💳',
    inquiry_response:       '📬',
    brand_reengagement:     '🤝',
    upload_cluster_warning: '📅',
    settlement_risk:        '⚠️',
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.color + '20' }]}>
        <Text style={styles.icon}>{TYPE_ICONS[rec.type] ?? '💡'}</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.color }]} numberOfLines={1}>
          {rec.title}
        </Text>
        <Text style={styles.bodyText} numberOfLines={2}>{rec.body}</Text>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: theme.color }]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>{rec.cta}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onDismiss} style={styles.dismiss} activeOpacity={0.7} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  headerTitle:     { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  headerCount:     { backgroundColor: '#6E56F0', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  headerCountText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 14, padding: 13, marginBottom: 8, borderWidth: 1,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:     { fontSize: 16 },

  body:     { flex: 1 },
  title:    { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  bodyText: { fontSize: 11, color: '#6B7280', lineHeight: 16, marginBottom: 8 },

  cta: {
    alignSelf: 'flex-start', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  ctaText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  dismiss:     { padding: 2, marginTop: 2 },
  dismissText: { fontSize: 13, color: '#9CA3AF' },
});
