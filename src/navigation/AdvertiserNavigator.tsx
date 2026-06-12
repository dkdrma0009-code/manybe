import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdvertiserHomeScreen from '../screens/advertiser/AdvertiserHomeScreen';
import MyProposalsScreen from '../screens/advertiser/MyProposalsScreen';
import AdvertiserSettingsScreen from '../screens/advertiser/AdvertiserSettingsScreen';
import DiscoverCreatorsScreen from '../screens/advertiser/DiscoverCreatorsScreen';
import CreatorProfileScreen from '../screens/advertiser/CreatorProfileScreen';
import SendProposalScreen from '../screens/advertiser/SendProposalScreen';
import FeedbackScreen from '../screens/settings/FeedbackScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import { tokens } from '../constants/tokens';

// ─── Stack param list (모달/카드 스크린 포함) ──────────────────────────────────

export type AdvertiserRootStackParamList = {
  AdvertiserTabs: undefined;
  DiscoverCreators: undefined;
  CreatorProfile: { creatorId: string };
  SendProposal: { creatorId: string; creatorName: string };
  MyProposals: undefined;
  Feedback: undefined;
  Chat: {
    proposalId: string;
    brandName: string;
    proposalMessage: string;
    amount: number;
    status: 'pending' | 'accepted' | 'rejected';
    role?: 'creator' | 'brand';
  };
};

export type AdvertiserTabParamList = {
  홈: undefined;
  제안내역: undefined;
  MY: undefined;
};

const Tab   = createBottomTabNavigator<AdvertiserTabParamList>();
const Stack = createNativeStackNavigator<AdvertiserRootStackParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { default: IoniconName; focused: IoniconName }> = {
  홈:    { default: 'home-outline',       focused: 'home' },
  제안내역: { default: 'paper-plane-outline', focused: 'paper-plane' },
  MY:   { default: 'person-outline',     focused: 'person' },
};

function AdvertiserTabNavigator() {
  const insets = useSafeAreaInsets();
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
        tabBarActiveTintColor: tokens.action,
        tabBarInactiveTintColor: tokens.ink4,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
          letterSpacing: 0.1,
        },
        tabBarIcon: ({ focused }) => (
          <View style={[s.wrapper, focused && s.wrapperActive]}>
            <Ionicons
              name={focused ? TAB_ICONS[route.name].focused : TAB_ICONS[route.name].default}
              size={22}
              color={focused ? tokens.action : tokens.ink4}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="홈"     component={AdvertiserHomeScreen} />
      <Tab.Screen name="제안내역" component={MyProposalsScreen} />
      <Tab.Screen name="MY"    component={AdvertiserSettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AdvertiserNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdvertiserTabs" component={AdvertiserTabNavigator} />
      <Stack.Screen name="DiscoverCreators" component={DiscoverCreatorsScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="SendProposal" component={SendProposalScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="MyProposals" component={MyProposalsScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ presentation: 'card' }} />
    </Stack.Navigator>
  );
}

const s = StyleSheet.create({
  wrapper: {
    width: 36, height: 28,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },
  wrapperActive: { backgroundColor: tokens.actionSoft },
  icon: { fontSize: 18 },
});
