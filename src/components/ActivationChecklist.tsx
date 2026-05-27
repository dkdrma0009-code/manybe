import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MILESTONE_META, MILESTONE_ORDER, type ActivationState } from '../types/activation';
import { tokens } from '../constants/tokens';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { TabParamList } from '../navigation/TabNavigator';

interface Props {
  state: ActivationState;
  pct:   number;
  completedCount: number;
  totalCount:     number;
}

type RootNav = NativeStackNavigationProp<RootStackParamList>;
type TabNav  = BottomTabNavigationProp<TabParamList>;

function useChecklistNav() {
  // Inside a Tab screen, useNavigation returns the Tab navigator.
  // getParent() reaches the root stack for screens like YouTubeConnect.
  const tabNav  = useNavigation<TabNav>();
  const rootNav = tabNav.getParent<RootNav>();

  return function navigate(dest: 'deals' | 'revenue' | 'channel' | 'insights' | null) {
    if (!dest) return;
    if (dest === 'channel')       rootNav?.navigate('YouTubeConnect');
    else if (dest === 'insights') tabNav.navigate('협찬');
    else if (dest === 'deals')    tabNav.navigate('협찬');
    else if (dest === 'revenue')  tabNav.navigate('협찬');
  };
}

export function ActivationChecklist({ state, pct, completedCount, totalCount }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useChecklistNav();

  // Don't render once everything is done
  if (completedCount === totalCount) return null;

  const incomplete = MILESTONE_ORDER.filter((m) => !state.completed[m]);
  const complete   = MILESTONE_ORDER.filter((m) => Boolean(state.completed[m]));

  return (
    <View style={s.card}>
      {/* Header row */}
      <TouchableOpacity
        style={s.header}
        onPress={() => setCollapsed((c) => !c)}
        activeOpacity={0.8}
      >
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>🚀 시작 가이드</Text>
          <Text style={s.headerSub}>{completedCount}/{totalCount} 완료</Text>
        </View>
        <View style={s.progressPill}>
          <Text style={s.progressPillText}>{pct}%</Text>
        </View>
        <Text style={s.chevron}>{collapsed ? '▸' : '▾'}</Text>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={s.trackWrap}>
        <View style={s.track}>
          <View style={[s.fill, { width: `${pct}%` as `${number}%` }]} />
        </View>
      </View>

      {/* Milestone list */}
      {!collapsed && (
        <View style={s.list}>
          {/* Completed */}
          {complete.map((m) => (
            <View key={m} style={s.row}>
              <View style={s.checkDone}>
                <Text style={s.checkDoneText}>✓</Text>
              </View>
              <Text style={s.rowTitleDone}>{MILESTONE_META[m].title}</Text>
            </View>
          ))}

          {/* Incomplete */}
          {incomplete.map((m, idx) => {
            const meta = MILESTONE_META[m];
            const isNext = idx === 0;
            return (
              <TouchableOpacity
                key={m}
                style={[s.row, isNext && s.rowNext]}
                onPress={() => navigate(meta.navigateTo)}
                activeOpacity={meta.navigateTo ? 0.7 : 1}
              >
                <View style={[s.checkEmpty, isNext && s.checkNextBorder]}>
                  <Text style={s.checkEmptyIcon}>{meta.icon}</Text>
                </View>
                <View style={s.rowBody}>
                  <Text style={[s.rowTitle, isNext && s.rowTitleNext]}>{meta.title}</Text>
                  {isNext && (
                    <Text style={s.rowDesc} numberOfLines={1}>{meta.description}</Text>
                  )}
                </View>
                {meta.navigateTo && isNext && (
                  <View style={s.ctaChip}>
                    <Text style={s.ctaChipText}>{meta.ctaLabel} →</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: tokens.surface,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tokens.primarySoft,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: tokens.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 8,
  },
  headerLeft:  { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '800', color: tokens.ink },
  headerSub:   { fontSize: 11, color: tokens.ink4, marginTop: 1 },
  progressPill: {
    backgroundColor: tokens.primarySoft,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  progressPillText: { fontSize: 11, fontWeight: '800', color: tokens.primary },
  chevron: { fontSize: 14, color: tokens.ink4, marginLeft: 2 },

  trackWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  track: { height: 4, backgroundColor: tokens.border, borderRadius: 2, overflow: 'hidden' },
  fill:  { height: 4, backgroundColor: tokens.primary, borderRadius: 2 },

  list: { paddingBottom: 10 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 9, gap: 12,
  },
  rowNext: {
    backgroundColor: tokens.primarySofter,
    marginHorizontal: 8, marginBottom: 4, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11,
  },

  checkDone: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: tokens.uploaded,
    alignItems: 'center', justifyContent: 'center',
  },
  checkDoneText: { fontSize: 12, color: '#fff', fontWeight: '800' },

  checkEmpty: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: tokens.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkNextBorder: { backgroundColor: tokens.primarySoft, borderWidth: 0 },
  checkEmptyIcon: { fontSize: 12 },

  rowBody: { flex: 1 },
  rowTitle:     { fontSize: 13, fontWeight: '600', color: tokens.ink3 },
  rowTitleDone: { fontSize: 13, fontWeight: '600', color: tokens.ink4, textDecorationLine: 'line-through' },
  rowTitleNext: { fontSize: 13, fontWeight: '800', color: tokens.ink },
  rowDesc:      { fontSize: 11, color: tokens.ink4, marginTop: 2 },

  ctaChip: {
    backgroundColor: tokens.primary,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  ctaChipText: { fontSize: 11, fontWeight: '800', color: '#fff' },
});
