// Phase 0 MVP 범위 (Notion 재정비안 2026-10-05 §11 「지금 개발하지 않는 것」)
// false = 코드·라우트·DB는 보존하고 사용자 진입 경로만 숨긴다.
// 앱 쪽 대응 플래그: src/config/featureFlags.ts
export const FEATURES = {
  CREATOR_WEB:    false, // /creator/* (대시보드·협찬 관리·수익&세금·캘린더) — MVP 크리에이터는 앱
  CHANNEL_BADGES: false, // 공개 미디어킷의 채널 강점 뱃지
} as const;
