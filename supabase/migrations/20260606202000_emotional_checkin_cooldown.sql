-- Migration: Emotional Check-in Cooldown
-- Solo otorgar chispas, puntos de valor y afecto con el compañero si han pasado al menos 8 horas desde el último registro

CREATE OR REPLACE FUNCTION on_emotional_checkin()
RETURNS TRIGGER AS $$
DECLARE
  v_companion   companions%ROWTYPE;
  v_has_recent  BOOLEAN;
BEGIN
  -- Verificar si ya hay un registro en las últimas 8 horas (excluyendo el actual)
  SELECT EXISTS (
    SELECT 1 FROM emotional_checkins
    WHERE child_id = NEW.child_id
      AND id != NEW.id
      AND occurred_at >= NEW.occurred_at - INTERVAL '8 hours'
  ) INTO v_has_recent;

  -- Si NO hay un registro reciente, otorgamos los premios
  IF NOT v_has_recent THEN
    -- Award sparks for check-in
    PERFORM award_sparks(
      NEW.child_id, 1, 'emotional_checkin', NEW.id,
      'Emotional check-in'
    );

    -- Value score: regulation dimension
    INSERT INTO value_score_events (child_id, dimension_id, delta, source_type, source_id)
    VALUES (NEW.child_id, 'regulation', 1, 'emotional_checkin', NEW.id);

    INSERT INTO child_value_scores (child_id, dimension_id, score)
    VALUES (NEW.child_id, 'regulation', 1)
    ON CONFLICT (child_id, dimension_id) DO UPDATE
      SET score = child_value_scores.score + 1, updated_at = NOW();

    -- Companion: bonding + responsiveness boost
    SELECT * INTO v_companion FROM companions WHERE child_id = NEW.child_id;
    IF FOUND THEN
      UPDATE companions
      SET
        bonding_score = bonding_score + 3,
        emotional_responsiveness = LEAST(100, emotional_responsiveness + 5)
      WHERE id = v_companion.id;

      INSERT INTO companion_interactions (companion_id, child_id, type, bonding_delta, context)
      VALUES (
        v_companion.id, NEW.child_id, 'emotional_checkin', 3,
        jsonb_build_object(
          'energy_level', NEW.energy_level,
          'valence', NEW.valence,
          'emotion_word', NEW.emotion_word
        )
      );
    END IF;
  ELSE
    -- Si hay un registro reciente, solo registramos la interacción con delta 0 para el historial del compañero
    SELECT * INTO v_companion FROM companions WHERE child_id = NEW.child_id;
    IF FOUND THEN
      INSERT INTO companion_interactions (companion_id, child_id, type, bonding_delta, context)
      VALUES (
        v_companion.id, NEW.child_id, 'emotional_checkin', 0,
        jsonb_build_object(
          'energy_level', NEW.energy_level,
          'valence', NEW.valence,
          'emotion_word', NEW.emotion_word,
          'cooldown_active', true
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
