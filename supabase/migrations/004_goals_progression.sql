-- ============================================================
-- MIRA — Migration 004: Goals + Microtasks + Progression
-- Phase 4
-- ============================================================

-- ─────────────────────────────────────────
-- GOALS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  why             TEXT,  -- "I want this because..."
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  target_date     DATE,
  value_dimensions TEXT[],
  total_sparks    INT NOT NULL DEFAULT 0 CHECK (total_sparks >= 0),
  visibility      TEXT NOT NULL DEFAULT 'child_and_parent'
                  CHECK (visibility IN ('child_and_parent', 'parent_only')),
  co_created      BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals: family read" ON goals;
CREATE POLICY "goals: family read" ON goals
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )
    -- Children only see child_and_parent goals
    AND (
      visibility = 'child_and_parent'
      OR auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'parent'
        AND family_id = goals.family_id
      )
    )
  );

DROP POLICY IF EXISTS "goals: parent write" ON goals;
CREATE POLICY "goals: parent write" ON goals
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────
-- GOAL MICROTASKS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goal_microtasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id          UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  position         INT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  effort_level     TEXT CHECK (effort_level IN ('easy', 'medium', 'stretch')),
  spark_value      INT NOT NULL DEFAULT 1 CHECK (spark_value BETWEEN 1 AND 10),
  value_dimensions TEXT[],
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'in_progress', 'complete')),
  ai_generated     BOOLEAN NOT NULL DEFAULT FALSE,
  ai_model_version TEXT,
  completed_at     TIMESTAMPTZ,
  completed_by     UUID REFERENCES profiles(id),
  UNIQUE (goal_id, position)
);

ALTER TABLE goal_microtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "microtasks: follow goal visibility" ON goal_microtasks;
CREATE POLICY "microtasks: follow goal visibility" ON goal_microtasks
  FOR SELECT USING (
    goal_id IN (
      SELECT id FROM goals WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "microtasks: child complete own" ON goal_microtasks;
CREATE POLICY "microtasks: child complete own" ON goal_microtasks
  FOR UPDATE USING (
    goal_id IN (
      SELECT id FROM goals WHERE child_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "microtasks: parent write" ON goal_microtasks;
CREATE POLICY "microtasks: parent write" ON goal_microtasks
  FOR ALL USING (
    goal_id IN (
      SELECT id FROM goals WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'
      )
    )
  );

-- ─────────────────────────────────────────
-- TRIGGER: Microtask completion → awards
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION on_microtask_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_goal        goals%ROWTYPE;
  v_companion   companions%ROWTYPE;
  v_dim         TEXT;
  v_all_done    BOOLEAN;
BEGIN
  -- Only fire on status transition to complete
  IF OLD.status = 'complete' OR NEW.status != 'complete' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_goal FROM goals WHERE id = NEW.goal_id;

  -- Award sparks for microtask
  PERFORM award_sparks(
    v_goal.child_id,
    NEW.spark_value,
    'goal_microtask',
    NEW.id,
    'Goal step: ' || NEW.title
  );

  -- Award value scores
  IF NEW.value_dimensions IS NOT NULL THEN
    FOREACH v_dim IN ARRAY NEW.value_dimensions LOOP
      INSERT INTO value_score_events (child_id, dimension_id, delta, source_type, source_id)
      VALUES (v_goal.child_id, v_dim, 1, 'routine_complete', NEW.id);

      INSERT INTO child_value_scores (child_id, dimension_id, score)
      VALUES (v_goal.child_id, v_dim, 1)
      ON CONFLICT (child_id, dimension_id) DO UPDATE
        SET score = child_value_scores.score + 1, updated_at = NOW();
    END LOOP;
  END IF;

  -- Companion bonding
  SELECT * INTO v_companion FROM companions WHERE child_id = v_goal.child_id;
  IF FOUND THEN
    UPDATE companions SET bonding_score = bonding_score + 2 WHERE id = v_companion.id;
    INSERT INTO companion_interactions (companion_id, child_id, type, bonding_delta, context)
    VALUES (v_companion.id, v_goal.child_id, 'goal_step_complete', 2,
      jsonb_build_object('goal_id', v_goal.id, 'microtask_id', NEW.id));
  END IF;

  -- Check if all microtasks are now complete → auto-complete goal
  SELECT NOT EXISTS (
    SELECT 1 FROM goal_microtasks
    WHERE goal_id = NEW.goal_id AND status != 'complete'
  ) INTO v_all_done;

  IF v_all_done THEN
    UPDATE goals
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.goal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_microtask_complete
  AFTER UPDATE OF status ON goal_microtasks
  FOR EACH ROW EXECUTE FUNCTION on_microtask_complete();

-- ─────────────────────────────────────────
-- TRIGGER: Goal complete → bonus awards
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION on_goal_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_dim TEXT;
BEGIN
  IF OLD.status = 'completed' OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Bonus sparks for goal completion
  PERFORM award_sparks(
    NEW.child_id, 5, 'goal_complete', NEW.id,
    'Goal completed: ' || NEW.title
  );

  -- Value scores for all tagged dimensions
  IF NEW.value_dimensions IS NOT NULL THEN
    FOREACH v_dim IN ARRAY NEW.value_dimensions LOOP
      INSERT INTO value_score_events (child_id, dimension_id, delta, source_type, source_id)
      VALUES (NEW.child_id, v_dim, 3, 'goal_complete', NEW.id);

      INSERT INTO child_value_scores (child_id, dimension_id, score)
      VALUES (NEW.child_id, v_dim, 3)
      ON CONFLICT (child_id, dimension_id) DO UPDATE
        SET score = child_value_scores.score + 3, updated_at = NOW();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_goal_complete
  AFTER UPDATE OF status ON goals
  FOR EACH ROW EXECUTE FUNCTION on_goal_complete();
