const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vrdurepiazvavuvmeoth:ZMhdxn6mVYDjusy1@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const sql = `
-- 1. Add DELETE RLS policy for routine completions
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "completions: child delete" ON public.routine_completions;
CREATE POLICY "completions: child delete" ON public.routine_completions
  FOR DELETE USING (child_id = auth.uid());

-- 2. Create uncompletion function and trigger for routines
CREATE OR REPLACE FUNCTION public.on_routine_uncompletion()
RETURNS TRIGGER AS $$
DECLARE
  v_routine     routines%ROWTYPE;
  v_companion   companions%ROWTYPE;
  v_dim         TEXT;
BEGIN
  SELECT * INTO v_routine FROM public.routines WHERE id = OLD.routine_id;

  -- Deduct sparks
  PERFORM public.award_sparks(
    OLD.child_id,
    -v_routine.spark_value,
    'routine_complete',
    OLD.id,
    'Deducción: Rutina desmarcada - ' || v_routine.title
  );

  -- Delete value score events
  DELETE FROM public.value_score_events WHERE child_id = OLD.child_id AND source_id = OLD.id;

  -- Deduct value scores
  IF v_routine.value_dimensions IS NOT NULL THEN
    FOREACH v_dim IN ARRAY v_routine.value_dimensions LOOP
      UPDATE public.child_value_scores 
      SET score = GREATEST(0, score - 1), updated_at = NOW()
      WHERE child_id = OLD.child_id AND dimension_id = v_dim;
    END LOOP;
  END IF;

  -- Deduct companion bonding
  SELECT * INTO v_companion FROM public.companions WHERE child_id = OLD.child_id;
  IF FOUND THEN
    UPDATE public.companions
      SET bonding_score = GREATEST(0, bonding_score - 2)
      WHERE id = v_companion.id;

    -- Delete companion interactions
    DELETE FROM public.companion_interactions 
    WHERE companion_id = v_companion.id AND child_id = OLD.child_id 
      AND type = 'routine_complete' 
      AND (context->>'routine_id')::uuid = OLD.routine_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_routine_uncompletion ON public.routine_completions;
CREATE TRIGGER trg_routine_uncompletion
  AFTER DELETE ON public.routine_completions
  FOR EACH ROW EXECUTE FUNCTION public.on_routine_uncompletion();

-- 3. Update microtask completion trigger to handle both complete and pending transitions
CREATE OR REPLACE FUNCTION public.on_microtask_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_goal        goals%ROWTYPE;
  v_companion   companions%ROWTYPE;
  v_dim         TEXT;
  v_all_done    BOOLEAN;
BEGIN
  SELECT * INTO v_goal FROM public.goals WHERE id = NEW.goal_id;

  -- Case A: Completed (Transition to complete)
  IF (OLD.status IS NULL OR OLD.status != 'complete') AND NEW.status = 'complete' THEN
    -- Award sparks for microtask
    PERFORM public.award_sparks(
      v_goal.child_id,
      NEW.spark_value,
      'goal_microtask',
      NEW.id,
      'Goal step: ' || NEW.title
    );

    -- Award value scores
    IF NEW.value_dimensions IS NOT NULL THEN
      FOREACH v_dim IN ARRAY NEW.value_dimensions LOOP
        INSERT INTO public.value_score_events (child_id, dimension_id, delta, source_type, source_id)
        VALUES (v_goal.child_id, v_dim, 1, 'routine_complete', NEW.id);

        INSERT INTO public.child_value_scores (child_id, dimension_id, score)
        VALUES (v_goal.child_id, v_dim, 1)
        ON CONFLICT (child_id, dimension_id) DO UPDATE
          SET score = child_value_scores.score + 1, updated_at = NOW();
      END LOOP;
    END IF;

    -- Companion bonding
    SELECT * INTO v_companion FROM public.companions WHERE child_id = v_goal.child_id;
    IF FOUND THEN
      UPDATE public.companions SET bonding_score = bonding_score + 2 WHERE id = v_companion.id;
      INSERT INTO public.companion_interactions (companion_id, child_id, type, bonding_delta, context)
      VALUES (v_companion.id, v_goal.child_id, 'goal_step_complete', 2,
        jsonb_build_object('goal_id', v_goal.id, 'microtask_id', NEW.id));
    END IF;

    -- Check if all microtasks are now complete → auto-complete goal
    SELECT NOT EXISTS (
      SELECT 1 FROM public.goal_microtasks
      WHERE goal_id = NEW.goal_id AND status != 'complete'
    ) INTO v_all_done;

    IF v_all_done THEN
      UPDATE public.goals
      SET status = 'completed', updated_at = NOW()
      WHERE id = NEW.goal_id;
    END IF;

  -- Case B: Uncompleted (Transition away from complete)
  ELSIF OLD.status = 'complete' AND NEW.status != 'complete' THEN
    -- Deduct sparks
    PERFORM public.award_sparks(
      v_goal.child_id,
      -NEW.spark_value,
      'goal_microtask',
      NEW.id,
      'Deducción: Paso desmarcado - ' || NEW.title
    );

    -- Delete value score events
    DELETE FROM public.value_score_events WHERE child_id = v_goal.child_id AND source_id = NEW.id;

    -- Deduct value scores
    IF NEW.value_dimensions IS NOT NULL THEN
      FOREACH v_dim IN ARRAY NEW.value_dimensions LOOP
        UPDATE public.child_value_scores
        SET score = GREATEST(0, score - 1), updated_at = NOW()
        WHERE child_id = v_goal.child_id AND dimension_id = v_dim;
      END LOOP;
    END IF;

    -- Deduct companion bonding
    SELECT * INTO v_companion FROM public.companions WHERE child_id = v_goal.child_id;
    IF FOUND THEN
      UPDATE public.companions SET bonding_score = GREATEST(0, bonding_score - 2) WHERE id = v_companion.id;
      DELETE FROM public.companion_interactions 
      WHERE companion_id = v_companion.id AND child_id = v_goal.child_id 
        AND type = 'goal_step_complete' 
        AND (context->>'microtask_id')::uuid = NEW.id;
    END IF;

    -- Check if goal status was 'completed', if so, reset it to 'active'
    IF v_goal.status = 'completed' THEN
      UPDATE public.goals
      SET status = 'active', updated_at = NOW()
      WHERE id = NEW.goal_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update goal complete trigger to handle both complete and active transitions
CREATE OR REPLACE FUNCTION public.on_goal_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_dim TEXT;
BEGIN
  -- Transition to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Bonus sparks for goal completion
    PERFORM public.award_sparks(
      NEW.child_id, 5, 'goal_complete', NEW.id,
      'Goal completed: ' || NEW.title
    );

    -- Value scores
    IF NEW.value_dimensions IS NOT NULL THEN
      FOREACH v_dim IN ARRAY NEW.value_dimensions LOOP
        INSERT INTO public.value_score_events (child_id, dimension_id, delta, source_type, source_id)
        VALUES (NEW.child_id, v_dim, 3, 'goal_complete', NEW.id);

        INSERT INTO public.child_value_scores (child_id, dimension_id, score)
        VALUES (NEW.child_id, v_dim, 3)
        ON CONFLICT (child_id, dimension_id) DO UPDATE
          SET score = child_value_scores.score + 3, updated_at = NOW();
      END LOOP;
    END IF;

  -- Transition away from completed
  ELSIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    -- Deduct bonus sparks
    PERFORM public.award_sparks(
      NEW.child_id, -5, 'goal_complete', NEW.id,
      'Deducción: Objetivo reabierto - ' || NEW.title
    );

    -- Delete value score events
    DELETE FROM public.value_score_events WHERE child_id = NEW.child_id AND source_id = NEW.id;

    -- Deduct value scores
    IF NEW.value_dimensions IS NOT NULL THEN
      FOREACH v_dim IN ARRAY NEW.value_dimensions LOOP
        UPDATE public.child_value_scores
        SET score = GREATEST(0, score - 3), updated_at = NOW()
        WHERE child_id = NEW.child_id AND dimension_id = v_dim;
      END LOOP;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to database.');
    await client.query(sql);
    console.log('Updated functions, triggers, and RLS policies successfully.');
  } catch (err) {
    console.error('Error updating database schema:', err);
  } finally {
    await client.end();
  }
}
run();
