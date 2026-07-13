-- Migration: Add cost column to reward_requests
ALTER TABLE reward_requests ADD COLUMN cost INT NOT NULL DEFAULT 10 CHECK (cost >= 0);
