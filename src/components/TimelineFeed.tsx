import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { TimelineGroup, TimelineItem } from '../types/timeline';

interface Props {
  groups: TimelineGroup[];
  loading?: boolean;
  maxItems?: number;
  onItemPress: (item: TimelineItem) => void;
  onMarkRead?: (id: string) => void;
  onViewAll?: () => void;
}

export function TimelineFeed({
  groups, loading, maxItems, onItemPress, onMarkRead, onViewAll,
}: Props) {
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" color="#6E56F0" />
      </View>
    );
  }

  const allItems = groups.flatMap((g) => g.items);
  if (allItems.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>✓</Text>
        <Text style={styles.emptyText}>처리할 항목이 없어요</Text>
      </View>
    );
  }

  // If maxItems set, flatten + slice across groups for compact home view
  if (maxItems) {
    const flat = allItems.slice(0, maxItems);
    return (
      <View>
        {flat.map((item) => (
          <TimelineCard key={item.id} item={item} onPress={onItemPress} onMarkRead={onMarkRead} />
        ))}
        {allItems.length > maxItems && onViewAll && (
          <TouchableOpacity style={styles.viewAll} onPress={onViewAll} activeOpacity={0.8}>
            <Text style={styles.viewAllText}>전체 {allItems.length}건 보기 →</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View>
      {groups.map((group) => (
        <View key={group.label}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.groupCount}>
              <Text style={styles.groupCountText}>{group.items.length}</Text>
            </View>
          </View>
          {group.items.map((item) => (
            <TimelineCard key={item.id} item={item} onPress={onItemPress} onMarkRead={onMarkRead} />
          ))}
        </View>
      ))}
    </View>
  );
}

function TimelineCard({
  item, onPress, onMarkRead,
}: {
  item: TimelineItem;
  onPress: (item: TimelineItem) => void;
  onMarkRead?: (id: string) => void;
}) {
  const isCritical = item.severity === 'critical';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: item.bg },
        isCritical && { borderWidth: 1.5, borderColor: item.color + '55' },
        !item.isRead && styles.cardUnread,
      ]}
      onPress={() => {
        onMarkRead?.(item.id);
        onPress(item);
      }}
      activeOpacity={0.82}
    >
      <View style={[styles.iconWrap, { backgroundColor: isCritical ? item.color : item.bg }]}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: item.color }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>{item.subtitle}</Text>
        {item.cta && (
          <View style={[styles.ctaChip, { backgroundColor: item.color + '20' }]}>
            <Text style={[styles.ctaText, { color: item.color }]}>{item.cta}</Text>
          </View>
        )}
      </View>

      <View style={styles.right}>
        {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: item.color }]} />}
        <Text style={[styles.arrow, { color: item.color }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loader: { paddingVertical: 24, alignItems: 'center' },
  empty: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#BBF7D0',
  },
  emptyIcon: { fontSize: 16, color: '#059669', fontWeight: '800' },
  emptyText: { fontSize: 13, fontWeight: '600', color: '#166534' },

  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 8, marginTop: 4,
  },
  groupLabel:     { fontSize: 13, fontWeight: '800', color: '#1A1A2E' },
  groupCount:     { backgroundColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  groupCountText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 13, marginBottom: 8,
  },
  cardUnread: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },

  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', opacity: 0.85 },
  icon:     { fontSize: 18 },

  body:    { flex: 1 },
  title:   { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  subtitle:{ fontSize: 11, color: '#6B7280', lineHeight: 16 },
  ctaChip: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4 },
  ctaText: { fontSize: 10, fontWeight: '700' },

  right:      { alignItems: 'center', gap: 4 },
  unreadDot:  { width: 7, height: 7, borderRadius: 4 },
  arrow:      { fontSize: 20, fontWeight: '600' },

  viewAll: {
    alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: '#F4F0FF', borderRadius: 20, marginTop: 2, marginBottom: 8,
  },
  viewAllText: { fontSize: 12, fontWeight: '700', color: '#6E56F0' },
});
