-- Migration: Routine Deletion Deduction
-- Restar chispas y puntuación de dimensiones de valor al borrar un registro de routine_completions

CREATE OR REPLACE FUNCTION on_routine_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_routine     routines%ROWTYPE;
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

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Borrar el trigger si ya existe para evitar errores
DROP TRIGGER IF EXISTS trg_routine_deletion ON routine_completions;

-- Crear el trigger
CREATE TRIGGER trg_routine_deletion
  AFTER DELETE ON routine_completions
  FOR EACH ROW EXECUTE FUNCTION on_routine_deletion();
