import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/dashboard/HomeScreen';
import RevenueScreen from '../screens/revenue/RevenueScreen';
import DealsScreen from '../screens/deals/DealsScreen';
import ScheduleScreen from '../screens/schedules/ScheduleScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { colors } from '../constants/colors';
import { useRealtime } from '../context/RealtimeContext';

export type TabParamList = {
  홈: undefined;
  협찬: undefined;
  캘린더: undefined;
  수익: undefined;
  인사이트: undefined;
  설정: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, string> = {
  홈: '🏠',
  협찬: '🤝',
  캘린더: '📅',
  수익: '💰',
  인사이트: '📊',
  설정: '⚙️',
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
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#C4C4C4',
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: 'bold',
          marginTop: 2,
        },
        tabBarIcon: ({ focused }) => {
          const showBadge = route.name === '협찬' && unreadInquiryCount > 0;
          return (
            <View style={[tabIconStyle.wrapper, focused && tabIconStyle.wrapperActive]}>
              <Text style={[tabIconStyle.icon, !focused && tabIconStyle.iconInactive]}>
                {TAB_ICONS[route.name]}
              </Text>
              {showBadge && (
                <View style={tabIconStyle.badge}>
                  <Text style={tabIconStyle.badgeText}>
                    {unreadInquiryCount > 9 ? '9+' : unreadInquiryCount}
                  </Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="협찬" component={DealsScreen} />
      <Tab.Screen name="캘린더" component={ScheduleScreen} />
      <Tab.Screen name="수익" component={RevenueScreen} />
      <Tab.Screen name="인사이트" component={AnalyticsScreen} />
      <Tab.Screen name="설정" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const tabIconStyle = StyleSheet.create({
  wrapper: {
    width: 32, height: 28, alignItems: 'center',
    justifyContent: 'center', borderRadius: 8,
  },
  wrapperActive: { backgroundColor: '#EDE9FE' },
  icon:          { fontSize: 20 },
  iconInactive:  { opacity: 0.5 },
  badge: {
    position: 'absolute', top: -4, right: -6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#C13C3C',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
