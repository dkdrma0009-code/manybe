import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen     from '../screens/dashboard/HomeScreen';
import DealsScreen    from '../screens/deals/DealsScreen';
import ScheduleScreen from '../screens/schedules/ScheduleScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { tokens } from '../constants/tokens';
import { useRealtime } from '../context/RealtimeContext';

export type TabParamList = {
  홈: undefined;
  협찬: undefined;
  일정: undefined;
  메시지: undefined;
  설정: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, string> = {
  홈:   '⌂',
  협찬:  '◎',
  일정:  '▦',
  메시지: '◻',
  설정:  '⚙',
};

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { unreadInquiryCount, unreadProposalMessageCount } = useRealtime();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: tokens.borderFaint,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: tokens.primary,
        tabBarInactiveTintColor: tokens.ink4,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
          letterSpacing: 0.1,
        },
        tabBarIcon: ({ focused }) => {
          const msgBadgeCount = unreadInquiryCount + unreadProposalMessageCount;
          const showBadge = route.name === '메시지' && msgBadgeCount > 0;
          return (
            <View style={[s.wrapper, focused && s.wrapperActive]}>
              <Text style={[s.icon, { color: focused ? tokens.primary : tokens.ink4 }]}>
                {TAB_ICONS[route.name]}
              </Text>
              {showBadge && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>
                    {msgBadgeCount > 9 ? '9+' : msgBadgeCount}
                  </Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="홈"   component={HomeScreen} />
      <Tab.Screen name="협찬"  component={DealsScreen} />
      <Tab.Screen name="일정"  component={ScheduleScreen} />
      <Tab.Screen name="메시지" component={MessagesScreen} />
      <Tab.Screen name="설정"  component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  wrapper: {
    width: 36, height: 28,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },
  wrapperActive: { backgroundColor: tokens.primarySoft },
  icon: { fontSize: 18 },
  badge: {
    position: 'absolute', top: -4, right: -6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: tokens.energy,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
