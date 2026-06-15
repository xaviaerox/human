-- Migration: Validate Routine Completion Steps
-- Asegurar que una rutina solo se pueda completar si todos sus pasos definidos han sido marcados.

CREATE OR REPLACE FUNCTION on_routine_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_routine     routines%ROWTYPE;
  v_companion   companions%ROWTYPE;
  v_dim         TEXT;
  v_mismatch    BOOLEAN;
BEGIN
  -- 1. Validar que todos los pasos reales de la rutina estén completados en la petición
  SELECT EXISTS (
    SELECT 1
    FROM (
      SELECT position
      FROM routine_steps
      WHERE routine_id = NEW.routine_id
    ) s
    FULL OUTER JOIN (
      SELECT DISTINCT UNNEST(COALESCE(NEW.steps_completed, ARRAY[]::INT[])) AS pos
    ) c ON s.position = c.pos
    WHERE s.position IS NULL OR c.pos IS NULL
  ) INTO v_mismatch;

  IF v_mismatch THEN
    RAISE EXCEPTION 'Cannot complete routine: all steps must be completed';
  END IF;

  -- 2. Obtener detalles de la rutina
  SELECT * INTO v_routine FROM routines WHERE id = NEW.routine_id;

  -- 3. Otorgar chispas (Spark Ledger)
  PERFORM award_sparks(
    NEW.child_id,
    v_routine.spark_value,
    'routine_complete',
    NEW.id,
    'Routine: ' || v_routine.title
  );

  -- 4. Otorgar puntos en las dimensiones de valor correspondientes
  IF v_routine.value_dimensions IS NOT NULL THEN
    FOREACH v_dim IN ARRAY v_routine.value_dimensions LOOP
      INSERT INTO value_score_events (
        child_id, dimension_id, delta, source_type, source_id
      ) VALUES (
        NEW.child_id, v_dim, 1, 'routine_complete', NEW.id
      );

      INSERT INTO child_value_scores (child_id, dimension_id, score)
      VALUES (NEW.child_id, v_dim, 1)
      ON CONFLICT (child_id, dimension_id) DO UPDATE
        SET score = child_value_scores.score + 1,
            updated_at = NOW();
    END LOOP;
  END IF;

  -- 5. Aumentar el afecto con el compañero (+2)
  SELECT * INTO v_companion FROM companions WHERE child_id = NEW.child_id;
  IF FOUND THEN
    UPDATE companions
      SET bonding_score = bonding_score + 2
      WHERE id = v_companion.id;

    INSERT INTO companion_interactions (companion_id, child_id, type, bonding_delta, context)
    VALUES (
      v_companion.id, NEW.child_id, 'routine_complete', 2,
      jsonb_build_object(
        'routine_id', NEW.routine_id,
        'routine_title', v_routine.title,
        'completion_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
