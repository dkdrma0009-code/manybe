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

  // Google OAuth Web Client ID — YouTube Analytics 연동에 사용
  // Google Cloud Console → OAuth 2.0 클라이언트 ID → 웹 애플리케이션 유형
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',

  // ── URL architecture (app.manybe.site) ─────────────────────────────────────
  // Future sub-domains for web / admin / API separation:
  //   app.manybe.site   → creator app (web)
  //   admin.manybe.site → admin dashboard
  //   api.manybe.site   → future serverless API layer
  SITE_DOMAIN: 'app.manybe.site',
  SITE_URL:    'https://app.manybe.site',

  // 공개 미디어킷 웹 베이스 URL (web/app/[slug] — 문의 폼 포함 공개 페이지).
  // 커스텀 도메인 연결 시 EXPO_PUBLIC_WEB_BASE_URL로 교체.
  WEB_BASE_URL: process.env.EXPO_PUBLIC_WEB_BASE_URL ?? 'https://manybe-web.vercel.app',

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

  // Instagram App ID — Instagram API with Instagram Login OAuth의 client_id
  // (Meta 앱 → Instagram 로그인 설정의 "Instagram 앱 ID". Facebook App ID와 다름)
  INSTAGRAM_APP_ID: process.env.EXPO_PUBLIC_INSTAGRAM_APP_ID ?? '',

  // (레거시) Facebook App ID — Facebook 로그인 방식 사용 시에만. 현재 미사용.
  FACEBOOK_APP_ID: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '',

  // RevenueCat — optional; absent until react-native-purchases is installed
  REVENUECAT_IOS_KEY:     process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY     ?? '',
  REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
} as const;

export type Env = typeof ENV;
