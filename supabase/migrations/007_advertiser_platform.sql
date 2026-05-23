-- ============================================================
-- 광고주 플랫폼 마이그레이션
-- ============================================================

-- ── profiles: role 추가 ──────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'creator'
  CHECK (role IN ('creator', 'advertiser'));

-- ── media_kits: category 추가 ────────────────────────────────
ALTER TABLE media_kits
  ADD COLUMN IF NOT EXISTS category text;

-- ── advertiser_proposals: advertiser_id 추가 ─────────────────
ALTER TABLE advertiser_proposals
  ADD COLUMN IF NOT EXISTS advertiser_id uuid REFERENCES auth.users(id);

-- advertiser_id가 있는 경우에만 INSERT 허용 (스팸 차단)
DROP POLICY IF EXISTS "proposals_insert" ON advertiser_proposals;
CREATE POLICY "proposals_insert" ON advertiser_proposals
  FOR INSERT WITH CHECK (auth.uid() = advertiser_id);

-- 광고주: 자신이 보낸 제안 조회
DROP POLICY IF EXISTS "proposals_select_advertiser" ON advertiser_proposals;
CREATE POLICY "proposals_select_advertiser" ON advertiser_proposals
  FOR SELECT USING (auth.uid() = advertiser_id);

-- ── discover: 공개 조회 허용 ─────────────────────────────────
DROP POLICY IF EXISTS "media_kits_public_select" ON media_kits;
CREATE POLICY "media_kits_public_select" ON media_kits
  FOR SELECT USING (is_form_enabled = true);

DROP POLICY IF EXISTS "social_channels_public_select" ON social_channels;
CREATE POLICY "social_channels_public_select" ON social_channels
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_public_select" ON profiles;
CREATE POLICY "profiles_public_select" ON profiles
  FOR SELECT USING (true);
