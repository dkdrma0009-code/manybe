-- ============================================================
-- Deal 상태 값 마이그레이션: 구 값 → 신규 파이프라인
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 실행 전 반드시 백업 또는 확인 후 진행
-- ============================================================

-- 1. 기존 값 → 새 값 매핑
UPDATE deals SET status = 'reviewing'   WHERE status = 'pending';
UPDATE deals SET status = 'in_progress' WHERE status = 'in_progress'; -- 그대로 유지
UPDATE deals SET status = 'settled'     WHERE status = 'completed';
UPDATE deals SET status = 'settled'     WHERE status = 'cancelled';

-- 2. 허용 값 제약이 있다면 갱신 (CHECK constraint 방식일 경우)
-- Supabase는 기본적으로 text 타입으로 저장하므로 아래는 선택 사항
-- ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;
-- ALTER TABLE deals ADD CONSTRAINT deals_status_check
--   CHECK (status IN ('inquiry','reviewing','in_progress','uploaded','settled'));

-- 3. deals 테이블에 source 컬럼이 없으면 추가 (InquiryDetailModal에서 사용)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source text;

-- 4. 결과 확인
SELECT status, COUNT(*) FROM deals GROUP BY status ORDER BY status;
