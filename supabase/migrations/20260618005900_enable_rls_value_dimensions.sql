-- ============================================================
-- MIRA — Migration: Enable RLS on value_dimensions Table
-- Fixes Supabase security advisory warning
-- ============================================================

-- 1. Enable Row Level Security (RLS) on value_dimensions
ALTER TABLE value_dimensions ENABLE ROW LEVEL SECURITY;

-- 2. Allow public read access to value_dimensions
DROP POLICY IF EXISTS "Allow select for everyone" ON value_dimensions;
CREATE POLICY "Allow select for everyone" ON value_dimensions
  FOR SELECT TO public
  USING (true);
