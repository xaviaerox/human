-- ============================================================
-- MIRA — Migration 20260726000000: Performance Composite Indexes
-- Optimizes frequent queries on high-traffic tables
-- ============================================================

-- 1. Spark Ledger: optimize balance calculations & ledger history by child
CREATE INDEX IF NOT EXISTS idx_spark_ledger_child_created 
  ON spark_ledger (child_id, created_at DESC);

-- 2. Routine Completions: optimize weekly routine count & completion checks
CREATE INDEX IF NOT EXISTS idx_routine_completions_child_completed 
  ON routine_completions (child_id, completed_at DESC);

-- 3. Companion Memories: optimize recent memory timeline queries
CREATE INDEX IF NOT EXISTS idx_companion_memories_child_created 
  ON companion_memories (child_id, created_at DESC);

-- 4. Emotional Checkins: optimize mood summary & weekly average queries
CREATE INDEX IF NOT EXISTS idx_emotional_checkins_child_created 
  ON emotional_checkins (child_id, created_at DESC);

-- 5. Child Badges: optimize child badge awards timeline
CREATE INDEX IF NOT EXISTS idx_child_badges_child_awarded 
  ON child_badges (child_id, awarded_at DESC);

-- 6. Reward Requests: optimize pending requests per family/child
CREATE INDEX IF NOT EXISTS idx_reward_requests_child_requested 
  ON reward_requests (child_id, requested_at DESC);
