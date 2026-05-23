import type { ExpoConfig, ConfigContext } from 'expo/config';

// Build-time environment — not embedded in bundle, used only for app.config decisions.
// For runtime access, use EXPO_PUBLIC_APP_ENV via src/config/env.ts.
const APP_ENV = process.env.APP_ENV ?? process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const IS_PROD  = APP_ENV === 'production';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,

  name: IS_PROD ? 'MANYBE' : 'MANYBE',
  slug: config.slug ?? 'manybe',

  extra: {
    ...config.extra,
    // Accessible via Constants.expoConfig?.extra in app code (supplemental only —
    // prefer reading directly from process.env.EXPO_PUBLIC_* for typed access).
    APP_ENV,
    BUILD_TIME: new Date().toISOString(),

    // ── URL architecture ───────────────────────────────────────────────────
    // Centralised here so app.config is the canonical record.
    // Sub-domains reserved for future services:
    //   app.manybe.site   → creator web app
    //   admin.manybe.site → admin dashboard
    //   api.manybe.site   → serverless / AI API layer
    SITE_URL:    'https://app.manybe.site',
    APP_SCHEME:  'manybe',

    // EAS project reference (already in extra.eas.projectId — mirrored for convenience)
    eas: {
      ...(config.extra?.eas ?? {}),
      projectId: '18c949fc-8f75-4c39-865f-00c081209bd7',
    },
  },
});
