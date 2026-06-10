ALTER TABLE channel_analyses
  ADD COLUMN IF NOT EXISTS inflow_keywords TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS audience_categories TEXT[] NOT NULL DEFAULT '{}';
