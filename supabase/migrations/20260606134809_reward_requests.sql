-- ============================================================
-- MIRA — Migration: Reward Requests System
-- ============================================================

CREATE TABLE IF NOT EXISTS reward_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  emoji           TEXT NOT NULL DEFAULT '🎁',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reward_requests ENABLE ROW LEVEL SECURITY;

-- Select policy: members of the family can read reward requests
DROP POLICY IF EXISTS "reward_requests: family read" ON reward_requests;
CREATE POLICY "reward_requests: family read" ON reward_requests
  FOR SELECT TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Insert policy: children can insert requests for themselves
DROP POLICY IF EXISTS "reward_requests: child insert" ON reward_requests;
CREATE POLICY "reward_requests: child insert" ON reward_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    child_id = auth.uid()
    AND family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'child'
    )
  );

-- All policy (write/delete): parents of the family can modify/delete reward requests
DROP POLICY IF EXISTS "reward_requests: parent write" ON reward_requests;
CREATE POLICY "reward_requests: parent write" ON reward_requests
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Trigger for auto updated_at
CREATE TRIGGER trg_reward_requests_updated_at
  BEFORE UPDATE ON reward_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE reward_requests;
