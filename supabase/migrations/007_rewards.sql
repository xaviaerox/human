-- ============================================================
-- MIRA — Migration 007: Rewards System
-- ============================================================

CREATE TABLE IF NOT EXISTS rewards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  cost            INT NOT NULL DEFAULT 5 CHECK (cost >= 0),
  emoji           TEXT NOT NULL DEFAULT '🎁',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Select policy: members of the family can read rewards
CREATE POLICY "rewards: family read" ON rewards
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )
  );

-- All policy (write/delete): parents of the family can modify rewards
CREATE POLICY "rewards: parent write" ON rewards
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Trigger for auto updated_at
CREATE TRIGGER trg_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
