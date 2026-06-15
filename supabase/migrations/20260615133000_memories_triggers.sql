-- ============================================================
-- MIRA — Migration: Memories Database Triggers
-- ============================================================

-- 1. Trigger function for emotional checkins (valence <= 2)
CREATE OR REPLACE FUNCTION on_emotional_checkin_memory()
RETURNS TRIGGER AS $$
DECLARE
  v_companion_id UUID;
BEGIN
  IF NEW.valence <= 2 THEN
    -- Get child's companion
    SELECT id INTO v_companion_id FROM companions WHERE child_id = NEW.child_id;
    IF FOUND THEN
      -- Inactive previous memories of difficult checkins to keep dialogue fresh
      UPDATE companion_memories 
        SET is_active = FALSE 
        WHERE child_id = NEW.child_id AND memory_type = 'difficult_checkin';

      -- Insert new difficult emotion memory
      INSERT INTO companion_memories (child_id, companion_id, memory_type, metadata)
      VALUES (
        NEW.child_id,
        v_companion_id,
        'difficult_checkin',
        jsonb_build_object(
          'emotion_word', NEW.emotion_word,
          'valence', NEW.valence,
          'energy_level', NEW.energy_level
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_emotional_checkin_memory
  AFTER INSERT ON emotional_checkins
  FOR EACH ROW EXECUTE FUNCTION on_emotional_checkin_memory();

-- 2. Trigger function for goal (adventure) completion
CREATE OR REPLACE FUNCTION on_goal_completed_memory()
RETURNS TRIGGER AS $$
DECLARE
  v_companion_id UUID;
BEGIN
  -- Check if status transitioned to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT id INTO v_companion_id FROM companions WHERE child_id = NEW.child_id;
    IF FOUND THEN
      -- Insert adventure complete memory
      INSERT INTO companion_memories (child_id, companion_id, memory_type, metadata)
      VALUES (
        NEW.child_id,
        v_companion_id,
        'adventure_complete',
        jsonb_build_object(
          'adventure_title', NEW.title,
          'goal_id', NEW.id
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_goal_completed_memory
  AFTER UPDATE OF status ON goals
  FOR EACH ROW EXECUTE FUNCTION on_goal_completed_memory();
