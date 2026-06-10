-- ============================================================
-- 웹 크리에이터 섹션 ↔ 모바일 스키마 통합
-- 웹(web/app/creator/*)이 참조하던 병렬 테이블(creator_profiles,
-- creator_channels, revenue_records, content_schedules)을 코드에서
-- 제거하고 기존 모바일 테이블을 단일 소스로 사용한다.
--
-- 주의: media_kit_views 등 일부 테이블이 대시보드에서 수동 생성되어
-- 이미 존재한다 (creator_id 스키마). 이 마이그레이션은 기존 테이블을
-- 파괴하지 않고 user_id 컬럼을 추가·백필해 통합한다.
-- 구 병렬 테이블들은 데이터 보존을 위해 삭제하지 않는다.
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

-- ── 3) media_kit_views — 미디어킷 조회 추적 ──
-- 없으면 user_id 스키마로 생성, 이미 있으면(구 creator_id 스키마)
-- user_id를 추가하고 creator_profiles를 통해 백필한다.
CREATE TABLE IF NOT EXISTS media_kit_views (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  -- 구 스키마였다면 user_id 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_kit_views' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE media_kit_views ADD COLUMN user_id uuid;
  END IF;

  -- creator_id가 있으면: NOT NULL 해제(신규 insert는 user_id만 쓰므로) + 백필
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_kit_views' AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE media_kit_views ALTER COLUMN creator_id DROP NOT NULL;

    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'creator_profiles'
    ) THEN
      UPDATE media_kit_views v
      SET user_id = cp.user_id
      FROM creator_profiles cp
      WHERE v.creator_id = cp.id AND v.user_id IS NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mkv_user_created
  ON media_kit_views (user_id, created_at);

ALTER TABLE media_kit_views ENABLE ROW LEVEL SECURITY;

-- 소유자만 자신의 조회 기록을 읽을 수 있다.
-- INSERT는 media-kit-page 엣지 함수(service role)만 수행 — anon 정책 없음.
DROP POLICY IF EXISTS "owner can read own views" ON media_kit_views;
CREATE POLICY "owner can read own views" ON media_kit_views
  FOR SELECT USING (auth.uid() = user_id);
