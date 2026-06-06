-- ============================================================
-- MIRA — Migration: Reward Cooldown Option
-- ============================================================

ALTER TABLE public.rewards
ADD COLUMN cooldown_hours INT NOT NULL DEFAULT 0 CHECK (cooldown_hours >= 0);
