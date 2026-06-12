-- ============================================================
-- schedules ↔ deals 연결
-- 협찬에서 자동 생성되는 일정(마감·마일스톤)이 deal을 참조하지 않아
-- 마감일 수정 시 일정이 중복 생성되고, 협찬 삭제 시 고아 일정이
-- 남던 문제의 근본 해결. ON DELETE CASCADE로 협찬 삭제 시
-- 관련 일정도 함께 정리된다.
-- ============================================================

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES deals(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_schedules_deal_id ON schedules (deal_id);
