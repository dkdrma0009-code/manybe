// Feature flag system — single place to gate features by environment or config.
// Keep flags as plain booleans; no network calls, no async.
// Future: replace constant booleans with remote config values from a flag service.

import { ENV } from './env';

export const FEATURES = {
  // ── Automation & Intelligence ─────────────────────────────────────────────
  AI_BRIEFING:           true,   // morning briefing + weekly review
  DECISION_ENGINE:       true,   // focus items + auto-suggestions
  BUSINESS_GRAPH:        true,   // brand relationship + HHI analysis
  SMART_RECOMMENDATIONS: true,   // persistent recommendation cards
  WEEKLY_REVIEW:         true,   // weekly review generation

  // ── External integrations ────────────────────────────────────────────────
  YOUTUBE_INTEGRATION: ENV.YOUTUBE_API_KEY.length > 0, // gated by API key
  PUSH_NOTIFICATIONS:  true,

  // ── Monetisation (not yet active) ────────────────────────────────────────
  // Phase 0: 광고주·크리에이터 모두 무료 — Upgrade 진입 경로 차단 (RevenueCat 코드는 보존)
  PAYWALL_ENABLED: false,

  // ── Phase 0 MVP 범위 (Notion 재정비안 2026-10-05 §11 「지금 개발하지 않는 것」) ──
  // false = 코드·라우트·DB는 보존하고 사용자 진입 경로만 숨긴다.
  DEALS_PIPELINE:    false, // 협찬 칸반 탭, 브랜드 상세, 내 작업실, 홈 협업 카드
  SCHEDULE:          false, // 일정 탭
  REVENUE:           false, // 수익·세금 화면, 홈 정산 대기 카드
  CHANNEL_ANALYTICS: false, // AI 채널 분석·인사이트 (Analytics 화면)
  ACTIVITY_TIMELINE: false, // 딜·일정·문의 기반 타임라인 (Notifications 화면)
  MEDIAKIT_INQUIRY:  false, // 미디어 키트 문의함
  CHANNEL_BADGES:    false, // 채널 강점 뱃지 (미디어킷 편집·미리보기)
  ADVERTISER_APP:    false, // 앱 광고주 플로우 — MVP 광고주는 웹

  // ── Dev / debug ───────────────────────────────────────────────────────────
  DEV_BYPASS_AUTH:  false, // mirrors AppNavigator.DEV_BYPASS_AUTH — keep in sync
  VERBOSE_LOGGING:  ENV.IS_DEV,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
