-- ============================================================
-- MIRA — Migration: Fix Badge Memories & Enable Goal Suggestions
-- ============================================================

-- 1. Re-create the on_child_badge_awarded_memory function to include parent_note
CREATE OR REPLACE FUNCTION on_child_badge_awarded_memory()
RETURNS TRIGGER AS $$
DECLARE
  v_companion_id UUID;
  v_val_label TEXT;
BEGIN
  -- Get child's companion
  SELECT id INTO v_companion_id FROM companions WHERE child_id = NEW.child_id;
  
  -- Get value dimension label
  SELECT label INTO v_val_label FROM value_dimensions WHERE id = NEW.dimension_id;
  
  IF FOUND AND v_companion_id IS NOT NULL THEN
    -- Insert new parent badge award memory
    INSERT INTO companion_memories (child_id, companion_id, memory_type, metadata)
    VALUES (
      NEW.child_id,
      v_companion_id,
      'parent_badge_award',
      jsonb_build_object(
        'badge_name', COALESCE(v_val_label, NEW.dimension_id),
        'badge_id', NEW.id,
        'badge_tier', NEW.badge_tier,
        'parent_note', NEW.parent_note
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create deletion trigger function to delete companion memory when a badge is deleted
CREATE OR REPLACE FUNCTION on_child_badge_deleted_memory()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM companion_memories
  WHERE memory_type = 'parent_badge_award'
    AND (metadata->>'badge_id')::UUID = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_child_badge_deleted_memory ON child_badges;
CREATE TRIGGER trg_child_badge_deleted_memory
  AFTER DELETE ON child_badges
  FOR EACH ROW EXECUTE FUNCTION on_child_badge_deleted_memory();

-- 3. Clean up existing data:
-- A. Delete orphaned badge award memories where the badge no longer exists
DELETE FROM companion_memories cm
WHERE cm.memory_type = 'parent_badge_award'
  AND NOT EXISTS (
    SELECT 1 FROM child_badges cb
    WHERE cb.id = (cm.metadata->>'badge_id')::UUID
  );

-- B. Retroactively copy parent_note to existing memories
UPDATE companion_memories cm
SET metadata = cm.metadata || jsonb_build_object('parent_note', cb.parent_note)
FROM child_badges cb
WHERE cm.memory_type = 'parent_badge_award'
  AND cb.id = (cm.metadata->>'badge_id')::UUID
  AND cb.parent_note IS NOT NULL;

-- 4. Enable child goal suggestions by allowing RLS insert policy for goals
DROP POLICY IF EXISTS "goals: child insert" ON goals;
CREATE POLICY "goals: child insert" ON goals
  FOR INSERT TO authenticated
  WITH CHECK (
    child_id = auth.uid()
    AND co_created = TRUE
    AND status = 'paused'
    AND family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'child'
    )
  );

-- 5. Enable child microtask suggestions by allowing RLS insert policy for microtasks
DROP POLICY IF EXISTS "microtasks: child insert own" ON goal_microtasks;
CREATE POLICY "microtasks: child insert own" ON goal_microtasks
  FOR INSERT TO authenticated
  WITH CHECK (
    goal_id IN (
      SELECT id FROM goals WHERE child_id = auth.uid()
    )
  );
