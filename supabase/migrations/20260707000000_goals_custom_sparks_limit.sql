-- ============================================================
-- MIRA — Migration: Goals Customizable Sparks & Daily Limit
-- ============================================================

-- 1. Add one_per_day setting to goals
ALTER TABLE goals ADD COLUMN IF NOT EXISTS one_per_day BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Modify existing microtasks to have 1 spark reward by default
UPDATE goal_microtasks SET spark_value = 1;

-- 3. Recalculate total_sparks on all existing goals
UPDATE goals g
SET total_sparks = (
  SELECT COALESCE(SUM(spark_value), 0)
  FROM goal_microtasks m
  WHERE m.goal_id = g.id
);

-- 4. Create trigger to prevent completing more than 1 milestone per day
CREATE OR REPLACE FUNCTION check_microtask_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_completed_today INT;
  v_one_per_day BOOLEAN;
BEGIN
  -- Only fire on transition to complete status
  IF NEW.status = 'complete' AND (OLD.status IS NULL OR OLD.status != 'complete') THEN
    SELECT one_per_day INTO v_one_per_day FROM goals WHERE id = NEW.goal_id;

    IF v_one_per_day = TRUE THEN
      -- Check if any microtask for the same goal was completed today (UTC date)
      SELECT COUNT(*) INTO v_completed_today
      FROM goal_microtasks
      WHERE goal_id = NEW.goal_id
        AND status = 'complete'
        AND completed_at::date = CURRENT_DATE;

      IF v_completed_today > 0 THEN
        RAISE EXCEPTION 'Solo puedes completar un hito al día para este objetivo.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_microtask_limit ON goal_microtasks;
CREATE TRIGGER trg_check_microtask_limit
  BEFORE UPDATE OF status ON goal_microtasks
  FOR EACH ROW EXECUTE FUNCTION check_microtask_limit();

-- 5. Create trigger to automatically keep total_sparks of goals in sync
CREATE OR REPLACE FUNCTION update_goal_total_sparks()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE goals
    SET total_sparks = (
      SELECT COALESCE(SUM(spark_value), 0)
      FROM goal_microtasks
      WHERE goal_id = NEW.goal_id
    )
    WHERE id = NEW.goal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE goals
    SET total_sparks = (
      SELECT COALESCE(SUM(spark_value), 0)
      FROM goal_microtasks
      WHERE goal_id = OLD.goal_id
    )
    WHERE id = OLD.goal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_goal_total_sparks ON goal_microtasks;
CREATE TRIGGER trg_update_goal_total_sparks
  AFTER INSERT OR UPDATE OF spark_value OR DELETE ON goal_microtasks
  FOR EACH ROW EXECUTE FUNCTION update_goal_total_sparks();
