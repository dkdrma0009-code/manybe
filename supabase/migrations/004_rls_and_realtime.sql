-- ============================================================
-- STEP 1: Fix RLS policies for all user-owned tables
-- Drop every existing policy cleanly, then recreate.
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── Enable RLS (idempotent) ──────────────────────────────────
ALTER TABLE deals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues             ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_kit_inquiries  ENABLE ROW LEVEL SECURITY;

-- ── deals: drop all then recreate ────────────────────────────
DO $$ DECLARE r record; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'deals' AND schemaname = 'public')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON deals', r.policyname); END LOOP;
END $$;

CREATE POLICY "deals_select" ON deals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "deals_insert" ON deals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "deals_update" ON deals
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "deals_delete" ON deals
  FOR DELETE USING (auth.uid() = user_id);

-- ── revenues: drop all then recreate ────────────────────────
DO $$ DECLARE r record; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'revenues' AND schemaname = 'public')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON revenues', r.policyname); END LOOP;
END $$;

CREATE POLICY "revenues_select" ON revenues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "revenues_insert" ON revenues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "revenues_update" ON revenues
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "revenues_delete" ON revenues
  FOR DELETE USING (auth.uid() = user_id);

-- ── schedules: drop all then recreate ────────────────────────
DO $$ DECLARE r record; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'schedules' AND schemaname = 'public')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON schedules', r.policyname); END LOOP;
END $$;

CREATE POLICY "schedules_select" ON schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "schedules_insert" ON schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "schedules_update" ON schedules
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "schedules_delete" ON schedules
  FOR DELETE USING (auth.uid() = user_id);

-- ── media_kit_inquiries: access via media_kits ownership ─────
DO $$ DECLARE r record; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'media_kit_inquiries' AND schemaname = 'public')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON media_kit_inquiries', r.policyname); END LOOP;
END $$;

-- Inquiries are owned through media_kits: creator can read/update their own kit's inquiries.
-- Brands (unauthenticated/anon) must be able to INSERT new inquiries.
CREATE POLICY "inquiries_select" ON media_kit_inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM media_kits
      WHERE media_kits.id = media_kit_inquiries.media_kit_id
        AND media_kits.user_id = auth.uid()
    )
  );

CREATE POLICY "inquiries_insert" ON media_kit_inquiries
  FOR INSERT WITH CHECK (true);  -- public submission, brand fills the form

CREATE POLICY "inquiries_update" ON media_kit_inquiries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM media_kits
      WHERE media_kits.id = media_kit_inquiries.media_kit_id
        AND media_kits.user_id = auth.uid()
    )
  );

-- ── STEP 2: Enable Realtime on all tables ────────────────────
-- Supabase Dashboard: Database > Replication > enable each table.
-- SQL equivalent (may need superuser):
ALTER TABLE deals               REPLICA IDENTITY FULL;
ALTER TABLE revenues            REPLICA IDENTITY FULL;
ALTER TABLE schedules           REPLICA IDENTITY FULL;
ALTER TABLE media_kit_inquiries REPLICA IDENTITY FULL;

-- ── Verify ────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('deals','revenues','schedules','media_kit_inquiries')
ORDER BY tablename, cmd;
