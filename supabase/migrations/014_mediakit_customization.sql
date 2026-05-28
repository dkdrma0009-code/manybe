-- media_kits: 뱃지, 테마, 섹션 순서 컬럼 추가
ALTER TABLE media_kits
  ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'indigo',
  ADD COLUMN IF NOT EXISTS section_order text[] DEFAULT ARRAY['channels', 'pricing', 'brands'];
