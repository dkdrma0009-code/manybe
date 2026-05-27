import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useAuth, handleOAuthCallback } from '../hooks/useAuth';
import { makeLogger } from '../utils/logger';
import { supabase } from '../api/supabase';

const log = makeLogger('DeepLink');

import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import TabNavigator from './TabNavigator';
import MediaKitSlugScreen from '../screens/settings/MediaKitSlugScreen';
import YouTubeConnectScreen from '../screens/settings/YouTubeConnectScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import InquiryScreen from '../screens/inquiries/InquiryScreen';
import MediaKitEditScreen from '../screens/settings/MediaKitEditScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import RoleSelectionScreen, { type UserRole } from '../screens/onboarding/RoleSelectionScreen';
import ChannelConnectScreen from '../screens/onboarding/ChannelConnectScreen';
import BrandDetailScreen from '../screens/brands/BrandDetailScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import { RealtimeProvider } from '../context/RealtimeContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import AdvertiserOnboardingScreen from '../screens/advertiser/AdvertiserOnboardingScreen';
import AdvertiserNavigator from './AdvertiserNavigator';
import { useNotifications } from '../hooks/useNotifications';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { colors } from '../constants/colors';
import type { TabParamList } from './TabNavigator';
import UpgradeScreen from '../screens/paywall/UpgradeScreen';
import MediaKitPreviewScreen from '../screens/mediakit/MediaKitPreviewScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import FeedbackScreen from '../screens/settings/FeedbackScreen';
import IncomingProposalsScreen from '../screens/advertiser/IncomingProposalsScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import StudioScreen from '../screens/studio/StudioScreen';
import RevenueScreen from '../screens/revenue/RevenueScreen';

// 개발 모드: 로그인 및 채널 연결 게이트 우회 (true = 로그인/채널 게이트 건너뜀)
const DEV_BYPASS_AUTH = false;

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<TabParamList> | undefined;
  MediaKitSlug: undefined;
  YouTubeConnect: undefined;
  Profile: undefined;
  Inquiries: undefined;
  MediaKitEdit: undefined;
  BrandDetail: { brand: string };
  Notifications: undefined;
  Upgrade: undefined;
  MediaKitPreview: undefined;
  Chat: {
    proposalId: string;
    brandName: string;
    proposalMessage: string;
    amount: number;
    status: 'pending' | 'accepted' | 'rejected';
  };
  Feedback: undefined;
  IncomingProposals: undefined;
  Analytics: undefined;
  Studio: undefined;
  Revenue: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function NotificationsInit({ userId }: { userId: string | undefined }) {
  useNotifications(userId);
  return null;
}

function MainNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main" component={TabNavigator} />
      <RootStack.Screen
        name="MediaKitSlug"
        component={MediaKitSlugScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="YouTubeConnect"
        component={YouTubeConnectScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="Inquiries"
        component={InquiryScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="MediaKitEdit"
        component={MediaKitEditScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="BrandDetail"
        component={BrandDetailScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="Upgrade"
        component={UpgradeScreen}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="MediaKitPreview"
        component={MediaKitPreviewScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="IncomingProposals"
        component={IncomingProposalsScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="Studio"
        component={StudioScreen}
        options={{ presentation: 'card' }}
      />
      <RootStack.Screen
        name="Revenue"
        component={RevenueScreen}
        options={{ presentation: 'card' }}
      />
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  const { session, loading } = useAuth();

  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [roleDone, setRoleDone] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [advertiserOnboardingDone, setAdvertiserOnboardingDone] = useState<boolean | null>(null);
  const [channelConnectDone, setChannelConnectDone] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('onboarding_complete'),
      AsyncStorage.getItem('user_role'),
      AsyncStorage.getItem('advertiser_onboarding_done'),
    ]).then(([onboarding, role, advOnboarding]) => {
      setOnboardingDone(onboarding === 'true');
      setRoleDone(role === 'creator' || role === 'advertiser');
      setUserRole((role as UserRole) || null);
      setAdvertiserOnboardingDone(advOnboarding === 'true');
    });
  }, []);

  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      setChannelConnectDone(true);
      return;
    }
    const userId = session?.user?.id;
    if (!userId) {
      // 로그인 전이면 채널 게이트 체크 불필요
      setChannelConnectDone(false);
      return;
    }
    supabase
      .from('social_channels')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => setChannelConnectDone((count ?? 0) > 0));
  }, [session?.user?.id]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!url.includes('access_token') && !url.includes('auth/callback')) return;
      log.info('OAuth callback received:', url);
      handleOAuthCallback(url);
    });

    Linking.getInitialURL().then((url) => {
      if (!url) return;
      if (!url.includes('access_token') && !url.includes('auth/callback')) return;
      log.info('Initial URL OAuth callback:', url);
      handleOAuthCallback(url);
    });

    return () => subscription.remove();
  }, []);

  const isAuthedUser = DEV_BYPASS_AUTH || !!session;
  const isAdvertiser = userRole === 'advertiser';
  const waitingForChannelCheck = isAuthedUser && !isAdvertiser && channelConnectDone === null;

  if (roleDone === null || advertiserOnboardingDone === null || loading || waitingForChannelCheck) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer>
          {!roleDone ? (
            <RoleSelectionScreen onComplete={(role) => { setUserRole(role); setRoleDone(true); }} />
          ) : !isAdvertiser && !onboardingDone ? (
            <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
          ) : !isAuthedUser ? (
            <AuthNavigator />
          ) : isAdvertiser && !advertiserOnboardingDone ? (
            <AdvertiserOnboardingScreen
              userId={session?.user?.id ?? ''}
              onComplete={() => setAdvertiserOnboardingDone(true)}
            />
          ) : !isAdvertiser && !channelConnectDone ? (
            <ChannelConnectScreen onComplete={() => setChannelConnectDone(true)} />
          ) : (
            <SubscriptionProvider userId={session?.user?.id}>
              <RealtimeProvider userId={session?.user?.id}>
                <NotificationsInit userId={session?.user?.id} />
                {isAdvertiser ? <AdvertiserNavigator /> : <MainNavigator />}
              </RealtimeProvider>
            </SubscriptionProvider>
          )}
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
