-- ============================================================
-- 웹 크리에이터 섹션 ↔ 모바일 스키마 통합
-- 웹(web/app/creator/*)이 참조하던 가상 테이블(creator_profiles,
-- creator_channels, revenue_records, content_schedules)을 제거하고
-- 기존 모바일 테이블을 단일 소스로 사용한다.
-- ============================================================

-- ── 1) social_channels 확장 — 웹 대시보드 채널 분석 데이터 ──
ALTER TABLE social_channels
  ADD COLUMN IF NOT EXISTS profile_image_url  text,
  ADD COLUMN IF NOT EXISTS avg_views          bigint,
  ADD COLUMN IF NOT EXISTS engagement_rate    numeric,
  ADD COLUMN IF NOT EXISTS subscriber_history jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS views_history      jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN social_channels.subscriber_history IS '[{date: YYYY-MM-DD, count: int}] 일별 구독자 스냅샷 (최대 180일)';
COMMENT ON COLUMN social_channels.views_history      IS '[{date: YYYY-MM-DD, views: int}] YouTube Analytics 일별 조회수 (최대 90일)';

-- ── 2) media_kits.badge_data — YouTube API 검증 자동 뱃지 ──
-- 기존 badges text[](수동 선택 뱃지)와 별개
ALTER TABLE media_kits
  ADD COLUMN IF NOT EXISTS badge_data jsonb NOT NULL DEFAULT '[]';

-- ── 3) media_kit_views — 미디어킷 조회 추적 (신규) ──
CREATE TABLE IF NOT EXISTS media_kit_views (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkv_user_created
  ON media_kit_views (user_id, created_at);

ALTER TABLE media_kit_views ENABLE ROW LEVEL SECURITY;

-- 소유자만 자신의 조회 기록을 읽을 수 있다.
-- INSERT는 media-kit-page 엣지 함수(service role)만 수행 — anon 정책 없음.
DROP POLICY IF EXISTS "owner can read own views" ON media_kit_views;
CREATE POLICY "owner can read own views" ON media_kit_views
  FOR SELECT USING (auth.uid() = user_id);
