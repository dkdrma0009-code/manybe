// Feature flag system — single place to gate features by environment or config.
// Keep flags as plain booleans; no network calls, no async.
// Future: replace constant booleans with remote config values from a flag service.

import { ENV } from './env';

export const FEATURES = {
  // ── Automation & Intelligence ─────────────────────────────────────────────
  AUTONOMOUS_ENGINE:     true,   // auto-schedules reminders, builds workflow chains
  AI_BRIEFING:           true,   // morning briefing + weekly review
  DECISION_ENGINE:       true,   // focus items + auto-suggestions
  BUSINESS_GRAPH:        true,   // brand relationship + HHI analysis
  SMART_RECOMMENDATIONS: true,   // persistent recommendation cards
  WEEKLY_REVIEW:         true,   // weekly review generation

  // ── External integrations ────────────────────────────────────────────────
  YOUTUBE_INTEGRATION: ENV.YOUTUBE_API_KEY.length > 0, // gated by API key
  PUSH_NOTIFICATIONS:  true,

  // ── Future AI runtime (not yet active) ───────────────────────────────────
  // Will enable conversational assistant, tool-call APIs, LLM context export.
  ASSISTANT_RUNTIME: false,

  // ── Monetisation (not yet active) ────────────────────────────────────────
  PAYWALL_ENABLED: false,

  // ── Dev / debug ───────────────────────────────────────────────────────────
  DEV_BYPASS_AUTH:  false, // mirrors AppNavigator.DEV_BYPASS_AUTH — keep in sync
  VERBOSE_LOGGING:  ENV.IS_DEV,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
