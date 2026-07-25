-- ============================================================
-- MIRA — Migration 20260725000000: Fix Goal Proposals RLS Policies
-- Enables seamless goal suggestions for any authenticated family member
-- ============================================================

-- 1. Enable RLS policy for inserting goals for family members
DROP POLICY IF EXISTS "goals: child insert" ON goals;
DROP POLICY IF EXISTS "goals: family insert" ON goals;

CREATE POLICY "goals: family insert" ON goals
  FOR INSERT TO authenticated
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 2. Enable RLS policy for inserting goal microtasks for family members
DROP POLICY IF EXISTS "microtasks: child insert own" ON goal_microtasks;
DROP POLICY IF EXISTS "microtasks: family insert" ON goal_microtasks;

CREATE POLICY "microtasks: family insert" ON goal_microtasks
  FOR INSERT TO authenticated
  WITH CHECK (
    goal_id IN (
      SELECT id FROM goals WHERE family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
