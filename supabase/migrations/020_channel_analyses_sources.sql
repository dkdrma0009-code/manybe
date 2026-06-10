ALTER TABLE channel_analyses
  ADD COLUMN IF NOT EXISTS inflow_source TEXT NOT NULL DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS audience_categories_source TEXT NOT NULL DEFAULT 'ai';
