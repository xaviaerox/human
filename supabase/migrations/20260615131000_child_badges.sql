-- ============================================================
-- MIRA — Migration: Child Badges System
-- ============================================================

CREATE TABLE IF NOT EXISTS child_badges (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id      UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  dimension_id   TEXT NOT NULL, -- references value_dimensions(id)
  badge_tier     TEXT NOT NULL CHECK (badge_tier IN ('bronze', 'silver', 'gold')),
  parent_note    TEXT,
  awarded_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE child_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges: family read" ON child_badges
  FOR SELECT TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "badges: parent write" ON child_badges
  FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE child_badges;
