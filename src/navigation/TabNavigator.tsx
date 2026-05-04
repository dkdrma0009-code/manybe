import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/dashboard/HomeScreen';
import RevenueScreen from '../screens/revenue/RevenueScreen';
import DealsScreen from '../screens/deals/DealsScreen';
import ScheduleScreen from '../screens/schedules/ScheduleScreen';
import { colors } from '../constants/colors';

export type TabParamList = {
  홈: undefined;
  수익: undefined;
  협찬: undefined;
  캘린더: undefined;
  설정: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, string> = {
  홈: '🏠',
  수익: '💰',
  협찬: '🤝',
  캘린더: '📅',
  설정: '⚙️',
};

function PlaceholderScreen({ route }: { route: { name: string } }) {
  return (
    <View style={placeholder.container}>
      <Text style={placeholder.icon}>{TAB_ICONS[route.name]}</Text>
      <Text style={placeholder.label}>{route.name} 화면</Text>
      <Text style={placeholder.sub}>준비 중입니다</Text>
    </View>
  );
}

const placeholder = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8FF' },
  icon: { fontSize: 48, marginBottom: 12 },
  label: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  sub: { fontSize: 14, color: '#9CA3AF', marginTop: 6 },
});

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

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
        tabBarIcon: ({ focused }) => (
          <View style={[tabIconStyle.wrapper, focused && tabIconStyle.wrapperActive]}>
            <Text style={[tabIconStyle.icon, !focused && tabIconStyle.iconInactive]}>
              {TAB_ICONS[route.name]}
            </Text>
          </View>
        ),
      })}
    >
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="수익" component={RevenueScreen} />
      <Tab.Screen name="협찬" component={DealsScreen} />
      <Tab.Screen name="캘린더" component={ScheduleScreen} />
      <Tab.Screen name="설정" component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}

const tabIconStyle = StyleSheet.create({
  wrapper: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  wrapperActive: {
    backgroundColor: '#EDE9FE',
  },
  icon: {
    fontSize: 20,
  },
  iconInactive: {
    opacity: 0.5,
  },
});
