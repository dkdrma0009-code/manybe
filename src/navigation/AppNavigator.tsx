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
import BrandDetailScreen from '../screens/brands/BrandDetailScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import { RealtimeProvider } from '../context/RealtimeContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { useNotifications } from '../hooks/useNotifications';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { colors } from '../constants/colors';
import type { TabParamList } from './TabNavigator';
import UpgradeScreen from '../screens/paywall/UpgradeScreen';

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
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  // Fallback: catch OAuth deep link when ASWebAuthenticationSession
  // fails to intercept exp:// and iOS delivers it as a system deep link.
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!url.includes('access_token') && !url.includes('auth/callback')) return;
      log.info('OAuth callback received:', url);
      handleOAuthCallback(url);
    });

    // Handle the case where the app was cold-launched via the deep link.
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      if (!url.includes('access_token') && !url.includes('auth/callback')) return;
      log.info('Initial URL OAuth callback:', url);
      handleOAuthCallback(url);
    });

    return () => subscription.remove();
  }, []);

  if (onboardingDone === null || (!DEV_BYPASS_AUTH && loading)) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  const isAuthed = DEV_BYPASS_AUTH || !!session;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer>
          {!onboardingDone ? (
            <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
          ) : !isAuthed ? (
            <AuthNavigator />
          ) : (
            <SubscriptionProvider userId={session?.user?.id}>
              <RealtimeProvider userId={session?.user?.id}>
                <NotificationsInit userId={session?.user?.id} />
                <MainNavigator />
              </RealtimeProvider>
            </SubscriptionProvider>
          )}
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
