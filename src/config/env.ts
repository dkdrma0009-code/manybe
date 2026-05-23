// Central environment configuration — single source of truth for all env vars.
// All process.env references in application code must flow through this module.
// Validated at module load: throws in __DEV__, logs+falls back in production.

type AppEnv = 'development' | 'preview' | 'production';

// ─── Validation ───────────────────────────────────────────────────────────────

function required(key: string, value: string | undefined): string {
  if (!value) {
    const msg = `[Config] Missing required env var: ${key}. Set it in .env or via EAS secrets.`;
    if (__DEV__) throw new Error(msg);
    console.error(msg);
    return '';
  }
  return value;
}

// ─── Core vars ────────────────────────────────────────────────────────────────

const APP_ENV = (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as AppEnv;

// ─── Exported config ──────────────────────────────────────────────────────────

export const ENV = {
  // Runtime identity
  APP_ENV,
  IS_DEV:     APP_ENV === 'development',
  IS_PREVIEW: APP_ENV === 'preview',
  IS_PROD:    APP_ENV === 'production',

  // Supabase — required for the app to function
  SUPABASE_URL:      required('EXPO_PUBLIC_SUPABASE_URL',      process.env.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),

  // YouTube — optional; feature-gated if missing
  YOUTUBE_API_KEY: process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '',

  // ── URL architecture (app.manybe.site) ─────────────────────────────────────
  // Future sub-domains for web / admin / API separation:
  //   app.manybe.site   → creator app (web)
  //   admin.manybe.site → admin dashboard
  //   api.manybe.site   → future serverless API layer
  SITE_DOMAIN: 'app.manybe.site',
  SITE_URL:    'https://app.manybe.site',

  // OAuth deep link scheme (matches app.json scheme + Android intentFilter)
  APP_SCHEME: 'manybe',

  // Web OAuth redirect — window.location.origin is correct for both dev and prod web.
  // Guard against React Native runtimes where window exists but window.location is undefined.
  // Ensure both origins are registered in Supabase → Auth → URL Configuration.
  //   Dev:  http://localhost:8081 (or exp://...)
  //   Prod: https://app.manybe.site
  WEB_OAUTH_REDIRECT:
    (typeof window !== 'undefined' && window.location?.origin) || 'https://app.manybe.site',

  // Mobile OAuth redirect (used with Linking.createURL — registered natively)
  MOBILE_OAUTH_PATH: 'auth/callback',

  // Supabase project reference (for service URLs, if needed by future AI runtime)
  SUPABASE_PROJECT_REF: 'bewcgxzcvxuwzwxcqzmk',

  // Facebook App ID — required for Instagram Business OAuth
  // Set in .env: EXPO_PUBLIC_FACEBOOK_APP_ID=<your_app_id>
  FACEBOOK_APP_ID: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '',

  // RevenueCat — optional; absent until react-native-purchases is installed
  REVENUECAT_IOS_KEY:     process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY     ?? '',
  REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
} as const;

export type Env = typeof ENV;
