-- ============================================================
-- Manybe DB 스키마 수정 마이그레이션
-- 실행 위치: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── deals ───────────────────────────────────────────────────
-- creator_id → user_id (코드 기준)
ALTER TABLE deals RENAME COLUMN creator_id TO user_id;

-- 누락된 컬럼 추가
ALTER TABLE deals ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS end_date date;

-- ── revenues ────────────────────────────────────────────────
-- 코드가 쓰는 이름으로 rename (테이블이 비어있으므로 안전)
ALTER TABLE revenues RENAME COLUMN type TO category;
ALTER TABLE revenues RENAME COLUMN memo TO description;
ALTER TABLE revenues RENAME COLUMN revenue_date TO date;

-- ── schedules ───────────────────────────────────────────────
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_time timestamptz;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS description text;

-- ── media_kit_inquiries ──────────────────────────────────────
ALTER TABLE media_kit_inquiries ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false NOT NULL;

-- ── profiles (push_token 이미 존재 확인됨) ───────────────────
-- push_token text 컬럼은 이미 존재함 — 작업 불필요

-- ── 완료 확인 쿼리 ──────────────────────────────────────────
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('deals','revenues','schedules','media_kit_inquiries')
  AND column_name IN ('user_id','brand','end_date','category','description','date','start_time','is_read')
ORDER BY table_name, column_name;
