-- ============================================================
-- MIRA — Migration: Badges Memories Trigger
-- ============================================================

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
        'badge_tier', NEW.badge_tier
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_child_badge_awarded_memory
  AFTER INSERT ON child_badges
  FOR EACH ROW EXECUTE FUNCTION on_child_badge_awarded_memory();
