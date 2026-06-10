import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../api/supabase';
import { ENV } from '../config/env';

WebBrowser.maybeCompleteAuthSession();

// Called from AppNavigator when app receives an OAuth deep link.
// Handles both openAuthSessionAsync success and system deep-link fallback.
export async function handleOAuthCallback(url: string): Promise<void> {
  if (!url) return;
  const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken) return;
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: ENV.WEB_OAUTH_REDIRECT },
      });
      return { error };
    }

    // Dev build: "manybe" scheme is registered natively.
    // Linking.createURL returns "manybe://auth/callback".
    // iOS: ASWebAuthenticationSession intercepts the redirect → result.type === 'success'.
    // Android: OS intent fires for manybe://, dismissing Chrome Custom Tabs → result.type === 'cancel'.
    //   Token is delivered via Linking.addEventListener in AppNavigator (fallback handler).
    const redirectUrl = Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });

    if (error || !data?.url) return { error };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    // iOS success path — Android takes the Linking fallback path instead.
    if (result.type === 'success') {
      await handleOAuthCallback(result.url);
    }

    return { error: null };
  };

  const signOut = async () => {
    // 기기에 남은 역할 선택을 초기화 — 다음 로그인 시 역할을 다시 고르게 한다.
    // (지우지 않으면 다른 계정으로 로그인해도 이전 역할 화면에 갇힌다)
    await AsyncStorage.multiRemove(['user_role', 'advertiser_onboarding_done']);
    await supabase.auth.signOut();
  };

  return { session, user, loading, signIn, signUp, signOut, signInWithGoogle };
}
