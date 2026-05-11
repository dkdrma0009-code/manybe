import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../api/supabase';

WebBrowser.maybeCompleteAuthSession();

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
        options: { redirectTo: window.location.origin },
      });
      return { error };
    }

    // Native (iOS/Android)
    const redirectUrl = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });
    if (error || !data.url) return { error };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (result.type === 'success') {
      const url = result.url;
      const params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1] ?? '');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? '',
        });
        return { error: setErr };
      }
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, user, loading, signIn, signUp, signOut, signInWithGoogle };
}
