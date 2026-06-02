ALTER TABLE media_kits
  ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT '[]'::jsonb;
