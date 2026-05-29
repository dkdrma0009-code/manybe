import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useTimeline } from '../../hooks/useTimeline';
import { TimelineFeed } from '../../components/TimelineFeed';
import { TimelineItem } from '../../types/timeline';
import { RootStackParamList } from '../../navigation/AppNavigator';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { groups, unreadCount, loading, refetch, markRead, markAllRead } = useTimeline(user?.id);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  function handleItemPress(item: TimelineItem) {
    if (!item.navigateTo) return;
    const target = item.navigateTo;
    if (target.screen === 'deals') {
      navigation.navigate('Main', { screen: '협찬' } as any);
    } else if (target.screen === 'inquiries') {
      navigation.navigate('Inquiries');
    } else if (target.screen === 'calendar') {
      navigation.navigate('Main', { screen: '일정' } as any);
    } else if (target.screen === 'revenue') {
      navigation.navigate('Revenue' as any);
    } else if (target.screen === 'BrandDetail') {
      navigation.navigate('BrandDetail', { brand: target.brand });
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} activeOpacity={0.7}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>타임라인</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.8}>
            <Text style={styles.markAll}>모두 읽음</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>읽지 않은 항목 {unreadCount}건</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#6E56F0" style={{ paddingVertical: 40 }} />
        ) : (
          <TimelineFeed
            groups={groups}
            onItemPress={handleItemPress}
            onMarkRead={markRead}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F5F3EF',
  },
  back:            { width: 36, alignItems: 'flex-start' },
  backText:        { fontSize: 28, color: '#6E56F0', fontWeight: '300', lineHeight: 32 },
  backPlaceholder: { width: 36 },
  title:           { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  markAll:         { fontSize: 13, fontWeight: '700', color: '#6E56F0' },

  unreadBanner: {
    marginHorizontal: 20, marginBottom: 8,
    backgroundColor: '#EAE3FF', borderRadius: 10,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  unreadBannerText: { fontSize: 12, fontWeight: '700', color: '#6E56F0' },

  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
});
