-- ============================================================
-- MIRA — Migration 006: Production Hardening
-- Indexes, offline queue, RLS audit, realtime grants
-- ============================================================

-- ─────────────────────────────────────────
-- PERFORMANCE INDEXES
-- ─────────────────────────────────────────

-- Routine completions: frequent lookup by child + date
CREATE INDEX IF NOT EXISTS idx_routine_completions_child_date
  ON routine_completions (child_id, completed_date DESC);

-- Routines: active lookup by family
CREATE INDEX IF NOT EXISTS idx_routines_family_active
  ON routines (family_id, is_active)
  WHERE is_active = TRUE;

-- Spark ledger: balance calculation by child
CREATE INDEX IF NOT EXISTS idx_spark_ledger_child
  ON spark_ledger (child_id, created_at DESC);

-- Emotional check-ins: recent lookup by child
CREATE INDEX IF NOT EXISTS idx_checkins_child_date
  ON emotional_checkins (child_id, occurred_at DESC);

-- Goal microtasks: by goal + status
CREATE INDEX IF NOT EXISTS idx_microtasks_goal_status
  ON goal_microtasks (goal_id, status);

-- Goals: by child + status
CREATE INDEX IF NOT EXISTS idx_goals_child_status
  ON goals (child_id, status)
  WHERE status != 'archived';

-- Companion interactions: count queries
CREATE INDEX IF NOT EXISTS idx_companion_interactions_companion_type
  ON companion_interactions (companion_id, type);

-- Value score events: by child + dimension
CREATE INDEX IF NOT EXISTS idx_value_events_child_dim
  ON value_score_events (child_id, dimension_id, occurred_at DESC);

-- ─────────────────────────────────────────
-- OFFLINE QUEUE
-- Stores client-side actions queued during offline
-- Drained server-side when connection restores
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offline_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'routine_complete', 'microtask_complete', 'emotional_checkin'
  )),
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error       TEXT
);

ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "queue: own read/write" ON offline_queue
  FOR ALL USING (user_id = auth.uid());

-- ─────────────────────────────────────────
-- FUNCTION: Process offline queue entry
-- Called when client reconnects
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_offline_entry(p_entry_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_entry offline_queue%ROWTYPE;
  v_result JSONB := '{}'::JSONB;
BEGIN
  SELECT * INTO v_entry FROM offline_queue WHERE id = p_entry_id AND processed_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Entry not found or already processed');
  END IF;

  BEGIN
    CASE v_entry.action_type
      WHEN 'routine_complete' THEN
        INSERT INTO routine_completions (
          routine_id, child_id, completed_date, steps_completed, note, emotion_after
        )
        SELECT
          (v_entry.payload->>'routine_id')::UUID,
          (v_entry.payload->>'child_id')::UUID,
          (v_entry.payload->>'completed_date')::DATE,
          ARRAY(SELECT jsonb_array_elements_text(v_entry.payload->'steps_completed'))::INT[],
          v_entry.payload->>'note',
          v_entry.payload->>'emotion_after'
        ON CONFLICT (routine_id, child_id, completed_date) DO NOTHING;

      WHEN 'microtask_complete' THEN
        UPDATE goal_microtasks
        SET status = 'complete',
            completed_at = NOW(),
            completed_by = (v_entry.payload->>'completed_by')::UUID
        WHERE id = (v_entry.payload->>'microtask_id')::UUID
          AND status != 'complete';

      WHEN 'emotional_checkin' THEN
        INSERT INTO emotional_checkins (
          child_id, emotion_word, energy_level, valence,
          context_type, note, prompted_by
        ) VALUES (
          (v_entry.payload->>'child_id')::UUID,
          v_entry.payload->>'emotion_word',
          (v_entry.payload->>'energy_level')::INT,
          (v_entry.payload->>'valence')::INT,
          v_entry.payload->>'context_type',
          v_entry.payload->>'note',
          COALESCE(v_entry.payload->>'prompted_by', 'child')
        );
    END CASE;

    UPDATE offline_queue SET processed_at = NOW() WHERE id = p_entry_id;
    v_result := jsonb_build_object('success', true, 'action_type', v_entry.action_type);

  EXCEPTION WHEN OTHERS THEN
    UPDATE offline_queue SET error = SQLERRM WHERE id = p_entry_id;
    v_result := jsonb_build_object('error', SQLERRM);
  END;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- REALTIME: Enable publications
-- ─────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE companions;
ALTER PUBLICATION supabase_realtime ADD TABLE spark_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE routine_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE goal_microtasks;

-- ─────────────────────────────────────────
-- SECURITY: Revoke direct insert on spark_ledger
-- Only award_sparks() SECURITY DEFINER may write
-- ─────────────────────────────────────────
REVOKE INSERT ON spark_ledger FROM authenticated;
REVOKE UPDATE ON spark_ledger FROM authenticated;
REVOKE DELETE ON spark_ledger FROM authenticated;

-- ─────────────────────────────────────────
-- FUNCTION: Full family data snapshot
-- Used for initial app load — single round trip
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_family_snapshot(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile     profiles%ROWTYPE;
  v_family      families%ROWTYPE;
  v_children    JSONB;
  v_companion   JSONB;
  v_sparks      JSONB;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Profile not found'); END IF;

  SELECT * INTO v_family FROM families WHERE id = v_profile.family_id;

  SELECT jsonb_agg(row_to_json(p)) INTO v_children
  FROM profiles p
  WHERE p.family_id = v_profile.family_id AND p.role = 'child';

  IF v_profile.role = 'child' THEN
    SELECT row_to_json(c) INTO v_companion
    FROM companions c WHERE c.child_id = p_user_id;

    SELECT jsonb_build_object('balance', COALESCE(SUM(delta), 0))
    INTO v_sparks
    FROM spark_ledger WHERE child_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'profile',   row_to_json(v_profile),
    'family',    row_to_json(v_family),
    'children',  COALESCE(v_children, '[]'::JSONB),
    'companion', v_companion,
    'sparks',    v_sparks
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
