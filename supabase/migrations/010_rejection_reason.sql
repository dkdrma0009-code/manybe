ALTER TABLE advertiser_proposals
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
