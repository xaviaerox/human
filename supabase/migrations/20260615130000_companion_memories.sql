-- ============================================================
-- MIRA — Migration: Companion Memories System
-- ============================================================

CREATE TABLE IF NOT EXISTS companion_memories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  memory_type  TEXT NOT NULL CHECK (memory_type IN (
    'routine_streak_milestone', 'difficult_checkin', 'adventure_complete', 'parent_badge_award'
  )),
  metadata     JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE companion_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memories: family read" ON companion_memories;
CREATE POLICY "memories: family read" ON companion_memories
  FOR SELECT TO authenticated
  USING (
    child_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "memories: child insert own" ON companion_memories;
CREATE POLICY "memories: child insert own" ON companion_memories
  FOR INSERT TO authenticated
  WITH CHECK (
    child_id = auth.uid()
  );

DROP POLICY IF EXISTS "memories: parent write" ON companion_memories;
CREATE POLICY "memories: parent write" ON companion_memories
  FOR ALL TO authenticated
  USING (
    child_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'
      )
    )
  );

-- Trigger for auto updated_at (if needed, though memories are immutable, let's keep it simple)
-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE companion_memories;
