-- Migration: Fix Routine Deletion and Uncompletion Trigger
-- Unificar el trigger de borrado de completitud de rutina para evitar duplicidad y mantener el afecto del compañero.

-- 1. Eliminar el trigger y la función legados duplicados si existen
DROP TRIGGER IF EXISTS trg_routine_uncompletion ON routine_completions;
DROP FUNCTION IF EXISTS on_routine_uncompletion();

-- 2. Actualizar on_routine_completion para registrar el completion_id en las interacciones
CREATE OR REPLACE FUNCTION on_routine_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_routine     routines%ROWTYPE;
  v_companion   companions%ROWTYPE;
  v_dim         TEXT;
BEGIN
  SELECT * INTO v_routine FROM routines WHERE id = NEW.routine_id;

  -- Award sparks (server-side, ledger integrity guaranteed)
  PERFORM award_sparks(
    NEW.child_id,
    v_routine.spark_value,
    'routine_complete',
    NEW.id,
    'Routine: ' || v_routine.title
  );

  -- Award value score events for each tagged dimension
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

  -- Companion bonding (+2 per routine completion)
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

-- 3. Redefinir la función on_routine_deletion para incluir el decremento de afecto del compañero
CREATE OR REPLACE FUNCTION on_routine_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_routine     routines%ROWTYPE;
  v_companion   companions%ROWTYPE;
  v_dim         TEXT;
BEGIN
  SELECT * INTO v_routine FROM routines WHERE id = OLD.routine_id;

  -- Restar sparks (guardando registro negativo en el ledger para auditoría)
  PERFORM award_sparks(
    OLD.child_id,
    -v_routine.spark_value,
    'routine_complete',
    OLD.id,
    'Rutina desmarcada: ' || v_routine.title
  );

  -- Borrar los eventos de puntuación originales
  DELETE FROM value_score_events
  WHERE source_type = 'routine_complete' AND source_id = OLD.id;

  -- Restar puntuación en child_value_scores
  IF v_routine.value_dimensions IS NOT NULL THEN
    FOREACH v_dim IN ARRAY v_routine.value_dimensions LOOP
      UPDATE child_value_scores
      SET score = GREATEST(0, score - 1),
          updated_at = NOW()
      WHERE child_id = OLD.child_id AND dimension_id = v_dim;
    END LOOP;
  END IF;

  -- Restar afecto con el compañero y borrar la interacción correspondiente
  SELECT * INTO v_companion FROM companions WHERE child_id = OLD.child_id;
  IF FOUND THEN
    UPDATE companions
      SET bonding_score = GREATEST(0, bonding_score - 2)
      WHERE id = v_companion.id;

    -- Borrar la interacción asociada a esta completitud (buscando por completion_id o con fallback al más reciente del mismo routine_id)
    DELETE FROM companion_interactions
    WHERE id IN (
      SELECT id FROM companion_interactions
      WHERE companion_id = v_companion.id AND child_id = OLD.child_id
        AND type = 'routine_complete'
        AND (
          (context->>'completion_id') = OLD.id::text
          OR (
            (context->>'completion_id') IS NULL
            AND (context->>'routine_id') = OLD.routine_id::text
          )
        )
      ORDER BY ((context->>'completion_id') = OLD.id::text) DESC, occurred_at DESC
      LIMIT 1
    );
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Asegurar que el trigger trg_routine_deletion esté correctamente vinculado
DROP TRIGGER IF EXISTS trg_routine_deletion ON routine_completions;

CREATE TRIGGER trg_routine_deletion
  AFTER DELETE ON routine_completions
  FOR EACH ROW EXECUTE FUNCTION on_routine_deletion();
