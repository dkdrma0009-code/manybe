-- ============================================================
-- Add deal_id to media_kit_inquiries
-- Required for inquiry → deal conversion flow
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Link column: inquiry → deal (nullable FK)
ALTER TABLE media_kit_inquiries
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES deals(id) ON DELETE SET NULL;

-- Index for reverse-lookup (deal → inquiry)
CREATE INDEX IF NOT EXISTS idx_media_kit_inquiries_deal_id
  ON media_kit_inquiries(deal_id);

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'media_kit_inquiries'
  AND column_name = 'deal_id';
