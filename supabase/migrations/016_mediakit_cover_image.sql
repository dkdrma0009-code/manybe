ALTER TABLE media_kits
  ADD COLUMN IF NOT EXISTS cover_image_url text DEFAULT NULL;
