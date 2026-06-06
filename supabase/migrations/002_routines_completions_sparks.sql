-- ============================================================
-- MIRA — Migration 002: Routines + Completions + Sparks + Values
-- Phase 2 Persistence Layer
-- ============================================================

-- ─────────────────────────────────────────
-- VALUE DIMENSIONS (reference table)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS value_dimensions (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_key    TEXT NOT NULL,
  color_token TEXT NOT NULL
);

INSERT INTO value_dimensions VALUES
  ('autonomy',   'Autonomy',   'Doing things independently',      'hand',    '--color-autonomy'),
  ('empathy',    'Empathy',    'Understanding how others feel',   'heart',   '--color-empathy'),
  ('regulation', 'Regulation', 'Managing my own emotions',        'wave',    '--color-regulation'),
  ('curiosity',  'Curiosity',  'Exploring and asking questions',  'sparkle', '--color-curiosity'),
  ('courage',    'Courage',    'Trying new or hard things',       'star',    '--color-courage'),
  ('connection', 'Connection', 'Feeling close to family',         'link',    '--color-connection')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────
-- CHILD VALUE SCORES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_value_scores (
  child_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dimension_id    TEXT NOT NULL REFERENCES value_dimensions(id),
  score           INT NOT NULL DEFAULT 0 CHECK (score >= 0),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (child_id, dimension_id)
);

ALTER TABLE child_value_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "value_scores: family read" ON child_value_scores
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────
-- VALUE SCORE EVENTS (ledger)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS value_score_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dimension_id  TEXT NOT NULL REFERENCES value_dimensions(id),
  delta         INT NOT NULL CHECK (delta > 0),
  source_type   TEXT NOT NULL CHECK (source_type IN (
    'routine_complete', 'goal_complete', 'emotional_checkin',
    'parent_recognition', 'free_exploration'
  )),
  source_id     UUID,
  note          TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE value_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "value_events: family read" ON value_score_events
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────
-- ROUTINES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  schedule_type   TEXT NOT NULL CHECK (schedule_type IN (
    'daily', 'weekdays', 'weekends', 'custom', 'one_off'
  )),
  schedule_days   INT[],
  time_of_day     TEXT CHECK (time_of_day IN ('morning', 'midday', 'evening', 'anytime')),
  scheduled_time  TIME,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  color_token     TEXT NOT NULL DEFAULT 'calm',
  icon_key        TEXT,
  value_dimensions TEXT[],
  spark_value     INT NOT NULL DEFAULT 1 CHECK (spark_value BETWEEN 1 AND 5),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routines: family read" ON routines
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "routines: parent write" ON routines
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE TRIGGER trg_routines_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────
-- ROUTINE STEPS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routine_steps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id        UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  position          INT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  duration_minutes  INT,
  visual_support    TEXT,
  UNIQUE (routine_id, position)
);

ALTER TABLE routine_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "steps: family read" ON routine_steps
  FOR SELECT USING (
    routine_id IN (
      SELECT id FROM routines WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────
-- ROUTINE COMPLETIONS
-- Idempotent: one per child per routine per date
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routine_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id      UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  child_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  steps_completed INT[] NOT NULL DEFAULT ARRAY[]::INT[],
  note            TEXT,
  emotion_after   TEXT,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (routine_id, child_id, completed_date)
);

ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completions: family read" ON routine_completions
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "completions: child insert" ON routine_completions
  FOR INSERT WITH CHECK (
    child_id = auth.uid()
  );

-- ─────────────────────────────────────────
-- SPARK LEDGER
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spark_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  delta         INT NOT NULL,
  balance_after INT NOT NULL CHECK (balance_after >= 0),
  source_type   TEXT NOT NULL CHECK (source_type IN (
    'routine_complete', 'goal_microtask', 'goal_complete',
    'emotional_checkin', 'parent_bonus', 'redemption'
  )),
  source_id     UUID,
  note          TEXT,
  awarded_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE spark_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sparks: family read" ON spark_ledger
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )
  );

-- No direct client insert — only via award_sparks() SECURITY DEFINER

CREATE VIEW spark_balances AS
SELECT child_id, COALESCE(SUM(delta), 0) AS balance
FROM spark_ledger
GROUP BY child_id;

-- ─────────────────────────────────────────
-- FUNCTION: award_sparks
-- Server-side only; never direct client insert
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION award_sparks(
  p_child_id    UUID,
  p_delta       INT,
  p_source_type TEXT,
  p_source_id   UUID DEFAULT NULL,
  p_note        TEXT DEFAULT NULL,
  p_awarded_by  UUID DEFAULT NULL
) RETURNS spark_ledger AS $$
DECLARE
  v_family_id   UUID;
  v_current_bal BIGINT;
  v_new_record  spark_ledger;
BEGIN
  SELECT family_id INTO v_family_id FROM profiles WHERE id = p_child_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Child profile not found: %', p_child_id;
  END IF;

  SELECT COALESCE(SUM(delta), 0) INTO v_current_bal
  FROM spark_ledger WHERE child_id = p_child_id;

  IF v_current_bal + p_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient sparks: balance would go negative';
  END IF;

  INSERT INTO spark_ledger (
    child_id, family_id, delta, balance_after,
    source_type, source_id, note, awarded_by
  ) VALUES (
    p_child_id, v_family_id, p_delta, v_current_bal + p_delta,
    p_source_type, p_source_id, p_note, p_awarded_by
  ) RETURNING * INTO v_new_record;

  RETURN v_new_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- TRIGGER: Routine completion → awards
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION on_routine_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_routine     routines%ROWTYPE;
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_routine_completion
  AFTER INSERT ON routine_completions
  FOR EACH ROW EXECUTE FUNCTION on_routine_completion();
