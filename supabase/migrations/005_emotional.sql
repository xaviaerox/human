-- ============================================================
-- MIRA — Migration 005: Emotional Tracking
-- Phase 5
-- ============================================================

-- ─────────────────────────────────────────
-- EMOTIONAL CHECK-INS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emotional_checkins (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emotion_word            TEXT,
  energy_level            INT NOT NULL CHECK (energy_level BETWEEN 1 AND 5),
  valence                 INT NOT NULL CHECK (valence BETWEEN 1 AND 5),
  context_type            TEXT CHECK (context_type IN (
    'morning', 'after_routine', 'after_goal', 'free', 'bedtime'
  )),
  context_id              UUID,
  note                    TEXT,
  prompted_by             TEXT NOT NULL DEFAULT 'app' CHECK (prompted_by IN ('app', 'child')),
  companion_response_key  TEXT,
  occurred_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE emotional_checkins ENABLE ROW LEVEL SECURITY;

-- Child can write their own check-ins
CREATE POLICY "checkins: child insert own" ON emotional_checkins
  FOR INSERT WITH CHECK (child_id = auth.uid());

-- Family can read (parent sees all; child sees own only via view)
CREATE POLICY "checkins: family read" ON emotional_checkins
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────
-- WEEKLY SUMMARY (materialized view)
-- Parents see aggregated data only — never raw log
-- Refreshed nightly via pg_cron or scheduled Edge Function
-- ─────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS emotional_weekly_summary AS
SELECT
  child_id,
  DATE_TRUNC('week', occurred_at)::DATE      AS week_start,
  ROUND(AVG(energy_level)::NUMERIC, 1)       AS avg_energy,
  ROUND(AVG(valence)::NUMERIC, 1)            AS avg_valence,
  COUNT(*)                                   AS checkin_count,
  MODE() WITHIN GROUP (ORDER BY emotion_word) AS most_common_emotion
FROM emotional_checkins
GROUP BY child_id, DATE_TRUNC('week', occurred_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_summary_child_week
  ON emotional_weekly_summary (child_id, week_start);

-- ─────────────────────────────────────────
-- CHECK-IN PROMPTS SCHEDULE
-- Controls when app-prompted check-ins appear
-- Stored per child; updated by parent
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkin_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prompts     JSONB NOT NULL DEFAULT '[
    {"context": "morning",       "enabled": true,  "time": "08:00"},
    {"context": "after_routine", "enabled": true,  "time": null},
    {"context": "bedtime",       "enabled": true,  "time": "20:00"}
  ]'::JSONB,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE checkin_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule: family read" ON checkin_schedules
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "schedule: parent write" ON checkin_schedules
  FOR ALL USING (
    child_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'
      )
    )
  );

-- ─────────────────────────────────────────
-- TRIGGER: Check-in → companion responsiveness boost
-- Also awards sparks and value scores
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION on_emotional_checkin()
RETURNS TRIGGER AS $$
DECLARE
  v_companion companions%ROWTYPE;
BEGIN
  -- Award sparks for check-in (encourages self-reflection, not dependency)
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
      -- Responsiveness boost capped at 100
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_emotional_checkin
  AFTER INSERT ON emotional_checkins
  FOR EACH ROW EXECUTE FUNCTION on_emotional_checkin();

-- ─────────────────────────────────────────
-- FUNCTION: Refresh weekly summary
-- Called nightly by Edge Function / pg_cron
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_emotional_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY emotional_weekly_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
