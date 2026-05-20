import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen    from '../screens/dashboard/HomeScreen';
import StudioScreen  from '../screens/studio/StudioScreen';
import ScheduleScreen from '../screens/schedules/ScheduleScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { tokens } from '../constants/tokens';
import { useRealtime } from '../context/RealtimeContext';

export type TabParamList = {
  홈: undefined;
  스튜디오: undefined;
  캘린더: undefined;
  메시지: undefined;
  설정: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, string> = {
  홈:      '⊞',
  스튜디오: '◈',
  캘린더:  '▦',
  메시지:  '◻',
  설정:    '◎',
};

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { unreadInquiryCount } = useRealtime();

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
          const showBadge = route.name === '메시지' && unreadInquiryCount > 0;
          return (
            <View style={[s.wrapper, focused && s.wrapperActive]}>
              <Text style={[s.icon, { color: focused ? tokens.primary : tokens.ink4 }]}>
                {TAB_ICONS[route.name]}
              </Text>
              {showBadge && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>
                    {unreadInquiryCount > 9 ? '9+' : unreadInquiryCount}
                  </Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="홈"      component={HomeScreen} />
      <Tab.Screen name="스튜디오" component={StudioScreen} />
      <Tab.Screen name="캘린더"  component={ScheduleScreen} />
      <Tab.Screen name="메시지"  component={MessagesScreen} />
      <Tab.Screen name="설정"    component={SettingsScreen} />
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
