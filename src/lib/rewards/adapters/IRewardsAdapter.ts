// ============================================================
// MIRA — IRewardsAdapter
// ============================================================

import type { Reward, Result } from '@/types';

export interface IRewardsAdapter {
  getRewards(familyId: string): Promise<Result<Reward[]>>;
  createReward(familyId: string, reward: Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>): Promise<Result<Reward>>;
  updateReward(rewardId: string, updates: Partial<Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>>): Promise<Result<Reward>>;
  deleteReward(rewardId: string): Promise<Result<void>>;
}
