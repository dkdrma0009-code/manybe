import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import TabNavigator from './TabNavigator';
import TaxCalculatorScreen from '../screens/tax/TaxCalculatorScreen';
import MediaKitSlugScreen from '../screens/settings/MediaKitSlugScreen';
import YouTubeConnectScreen from '../screens/settings/YouTubeConnectScreen';
import AEExportScreen from '../screens/export/AEExportScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import InquiryScreen from '../screens/inquiries/InquiryScreen';
import MediaKitEditScreen from '../screens/settings/MediaKitEditScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { colors } from '../constants/colors';

// 개발 중 인증 우회 — 배포 전 false로 변경
const DEV_BYPASS_AUTH = false;

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  TaxCalculator: undefined;
  MediaKitSlug: undefined;
  YouTubeConnect: undefined;
  AEExport: undefined;
  Profile: undefined;
  Inquiries: undefined;
  MediaKitEdit: undefined;
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

function MainNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main" component={TabNavigator} />
      <RootStack.Screen
        name="TaxCalculator"
        component={TaxCalculatorScreen}
        options={{ presentation: 'card' }}
      />
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
        name="AEExport"
        component={AEExportScreen}
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
      <NavigationContainer>
        {!onboardingDone ? (
          <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
        ) : !isAuthed ? (
          <AuthNavigator />
        ) : (
          <MainNavigator />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
