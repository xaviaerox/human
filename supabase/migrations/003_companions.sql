-- ============================================================
-- MIRA — Migration 003: Companion System
-- Phase 3 Companion Core
-- ============================================================

-- ─────────────────────────────────────────
-- COMPANIONS
-- One per child; created at onboarding
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id                  UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                      TEXT,  -- NULL until child names it at onboarding
  stage                     TEXT NOT NULL DEFAULT 'egg'
                              CHECK (stage IN ('egg', 'sprout', 'bloom', 'glow', 'radiant')),
  stage_unlocked_at         JSONB NOT NULL DEFAULT '{}'::JSONB,
  bonding_score             INT NOT NULL DEFAULT 0 CHECK (bonding_score >= 0),
  emotional_responsiveness  INT NOT NULL DEFAULT 50
                              CHECK (emotional_responsiveness BETWEEN 10 AND 100),
  personality_traits        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE companions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companions: family read" ON companions;
CREATE POLICY "companions: family read" ON companions
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "companions: child update own" ON companions;
CREATE POLICY "companions: child update own" ON companions
  FOR UPDATE USING (child_id = auth.uid());

-- ─────────────────────────────────────────
-- COMPANION INTERACTIONS LOG
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companion_interactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id  UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  child_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN (
    'routine_complete', 'emotional_checkin', 'goal_step_complete',
    'free_interaction', 'spark_received', 'name_given'
  )),
  bonding_delta INT NOT NULL DEFAULT 0 CHECK (bonding_delta >= 0),
  context       JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE companion_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactions: family read" ON companion_interactions;
CREATE POLICY "interactions: family read" ON companion_interactions
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────
-- TRIGGER: updated_at on companions
-- ─────────────────────────────────────────
CREATE TRIGGER trg_companions_updated_at
  BEFORE UPDATE ON companions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────
-- TRIGGER: Stage progression (never regresses)
-- egg(0) → sprout(25) → bloom(75) → glow(175) → radiant(350)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION on_companion_bonding_update()
RETURNS TRIGGER AS $$
DECLARE
  v_new_stage TEXT;
  v_stage_order TEXT[] := ARRAY['egg', 'sprout', 'bloom', 'glow', 'radiant'];
  v_current_idx INT;
  v_new_idx INT;
BEGIN
  -- Determine stage from bonding score
  v_new_stage := CASE
    WHEN NEW.bonding_score >= 350 THEN 'radiant'
    WHEN NEW.bonding_score >= 175 THEN 'glow'
    WHEN NEW.bonding_score >= 75  THEN 'bloom'
    WHEN NEW.bonding_score >= 25  THEN 'sprout'
    ELSE 'egg'
  END;

  -- Find current and new indices
  SELECT array_position(v_stage_order, OLD.stage) INTO v_current_idx;
  SELECT array_position(v_stage_order, v_new_stage) INTO v_new_idx;

  -- Only advance, never regress
  IF v_new_idx > v_current_idx THEN
    NEW.stage := v_new_stage;
    NEW.stage_unlocked_at := OLD.stage_unlocked_at ||
      jsonb_build_object(v_new_stage, NOW()::TEXT);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companion_stage_progression
  BEFORE UPDATE OF bonding_score ON companions
  FOR EACH ROW EXECUTE FUNCTION on_companion_bonding_update();

-- ─────────────────────────────────────────
-- TRIGGER: Routine completion → companion bonding
-- Extends migration 002's on_routine_completion
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION on_routine_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_routine     routines%ROWTYPE;
  v_companion   companions%ROWTYPE;
  v_dim         TEXT;
BEGIN
  SELECT * INTO v_routine FROM routines WHERE id = NEW.routine_id;

  -- Award sparks
  PERFORM award_sparks(
    NEW.child_id,
    v_routine.spark_value,
    'routine_complete',
    NEW.id,
    'Routine: ' || v_routine.title
  );

  -- Award value scores
  IF v_routine.value_dimensions IS NOT NULL THEN
    FOREACH v_dim IN ARRAY v_routine.value_dimensions LOOP
      INSERT INTO value_score_events (child_id, dimension_id, delta, source_type, source_id)
      VALUES (NEW.child_id, v_dim, 1, 'routine_complete', NEW.id);

      INSERT INTO child_value_scores (child_id, dimension_id, score)
      VALUES (NEW.child_id, v_dim, 1)
      ON CONFLICT (child_id, dimension_id) DO UPDATE
        SET score = child_value_scores.score + 1, updated_at = NOW();
    END LOOP;
  END IF;

  -- Companion bonding (+2 per routine completion)
  SELECT * INTO v_companion FROM companions WHERE child_id = NEW.child_id;
  IF FOUND THEN
    UPDATE companions
      SET bonding_score = bonding_score + 2
      WHERE id = v_companion.id;

    INSERT INTO companion_interactions (companion_id, child_id, type, bonding_delta, context)
    VALUES (
      v_companion.id, NEW.child_id, 'routine_complete', 2,
      jsonb_build_object('routine_id', NEW.routine_id, 'routine_title', v_routine.title)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger (replaces migration 002 version)
DROP TRIGGER IF EXISTS trg_routine_completion ON routine_completions;
CREATE TRIGGER trg_routine_completion
  AFTER INSERT ON routine_completions
  FOR EACH ROW EXECUTE FUNCTION on_routine_completion();

-- ─────────────────────────────────────────
-- FUNCTION: Create companion at onboarding
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_companion(
  p_child_id  UUID,
  p_name      TEXT
) RETURNS companions AS $$
DECLARE
  v_companion companions;
BEGIN
  INSERT INTO companions (child_id, name, stage_unlocked_at)
  VALUES (p_child_id, p_name, jsonb_build_object('egg', NOW()::TEXT))
  RETURNING * INTO v_companion;

  -- Log the naming interaction
  INSERT INTO companion_interactions (companion_id, child_id, type, bonding_delta, context)
  VALUES (v_companion.id, p_child_id, 'name_given', 5, jsonb_build_object('name', p_name));

  -- Naming gives an initial bonding boost
  UPDATE companions SET bonding_score = 5 WHERE id = v_companion.id
  RETURNING * INTO v_companion;

  RETURN v_companion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- FUNCTION: Soft decay emotional_responsiveness
-- Called nightly by a scheduled job
-- Floor is 10 — companion never becomes unresponsive
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION decay_emotional_responsiveness()
RETURNS void AS $$
BEGIN
  UPDATE companions
  SET emotional_responsiveness = GREATEST(10, emotional_responsiveness - 2)
  WHERE child_id NOT IN (
    -- Children who had a check-in in the last 48 hours
    SELECT DISTINCT child_id FROM emotional_checkins
    WHERE occurred_at > NOW() - INTERVAL '48 hours'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
