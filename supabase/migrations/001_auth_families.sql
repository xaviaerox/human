-- ============================================================
-- MIRA — Migration 001: Auth + Families
-- Phase 1 Foundation
-- ============================================================

-- ─────────────────────────────────────────
-- FAMILIES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  settings    JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- { "timezone": "Europe/Madrid", "locale": "es", "theme": "calm" }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- PROFILES
-- Extends Supabase auth.users
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id     UUID REFERENCES families(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  display_name  TEXT NOT NULL,
  avatar_seed   TEXT,
  birth_year    INT CHECK (birth_year > 1900 AND birth_year <= EXTRACT(YEAR FROM NOW())),
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- FAMILY INVITES
-- Parents invite other family members
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  invited_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code   TEXT NOT NULL UNIQUE DEFAULT SUBSTRING(gen_random_uuid()::TEXT, 1, 8),
  role          TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  used_by       UUID REFERENCES profiles(id),
  used_at       TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- SECURITY DEFINER HELPERS FOR RLS
-- (Prevents infinite recursion in RLS policies)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_parent()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- POLICIES ON FAMILIES
-- ─────────────────────────────────────────
-- Family members can read their own family
CREATE POLICY "families: members read own" ON families
  FOR SELECT USING (
    id = get_my_family_id()
  );

-- Parents can update family settings
CREATE POLICY "families: parent update" ON families
  FOR UPDATE USING (
    id = get_my_family_id() AND is_parent()
  );

-- ─────────────────────────────────────────
-- POLICIES ON PROFILES
-- ─────────────────────────────────────────
-- Family members can read all profiles in their family
CREATE POLICY "profiles: family read" ON profiles
  FOR SELECT USING (
    family_id = get_my_family_id()
  );

-- Users can update their own profile
CREATE POLICY "profiles: own update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Users can insert their own profile (called on signup)
CREATE POLICY "profiles: own insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────────
-- POLICIES ON FAMILY INVITES
-- ─────────────────────────────────────────
-- Family members can read their family's invites
CREATE POLICY "invites: family read" ON family_invites
  FOR SELECT USING (
    family_id = get_my_family_id()
  );

-- Parents can create invites for their family
CREATE POLICY "invites: parent insert" ON family_invites
  FOR INSERT WITH CHECK (
    family_id = get_my_family_id() AND is_parent()
  );

-- Anyone can read a specific invite by code (for join flow)
CREATE POLICY "invites: read by code" ON family_invites
  FOR SELECT USING (TRUE); -- Filtered by invite_code in query

-- ─────────────────────────────────────────
-- FUNCTION: Create family + parent profile
-- Called atomically on parent signup
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_family_with_parent(
  p_user_id       UUID,
  p_family_name   TEXT,
  p_display_name  TEXT,
  p_avatar_seed   TEXT DEFAULT NULL
) RETURNS families AS $$
DECLARE
  v_family families;
BEGIN
  INSERT INTO families (name)
  VALUES (p_family_name)
  RETURNING * INTO v_family;

  INSERT INTO profiles (id, family_id, role, display_name, avatar_seed)
  VALUES (p_user_id, v_family.id, 'parent', p_display_name, p_avatar_seed);

  RETURN v_family;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- FUNCTION: Join family via invite code
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION join_family_with_invite(
  p_user_id       UUID,
  p_invite_code   TEXT,
  p_display_name  TEXT,
  p_birth_year    INT DEFAULT NULL,
  p_avatar_seed   TEXT DEFAULT NULL
) RETURNS profiles AS $$
DECLARE
  v_invite  family_invites%ROWTYPE;
  v_profile profiles%ROWTYPE;
BEGIN
  -- Validate invite
  SELECT * INTO v_invite
  FROM family_invites
  WHERE LOWER(invite_code) = LOWER(p_invite_code)
    AND used_by IS NULL
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Create profile
  INSERT INTO profiles (id, family_id, role, display_name, birth_year, avatar_seed)
  VALUES (p_user_id, v_invite.family_id, v_invite.role, p_display_name, p_birth_year, p_avatar_seed)
  RETURNING * INTO v_profile;

  -- Mark invite used
  UPDATE family_invites
  SET used_by = p_user_id, used_at = NOW()
  WHERE id = v_invite.id;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- TRIGGER: Auto-update updated_at
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
