// ============================================================
// MIRA — IRewardsAdapter
// ============================================================

import type { Reward, RewardRequest, Result } from '@/types';

export interface IRewardsAdapter {
  getRewards(familyId: string): Promise<Result<Reward[]>>;
  createReward(familyId: string, reward: Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>): Promise<Result<Reward>>;
  updateReward(rewardId: string, updates: Partial<Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>>): Promise<Result<Reward>>;
  deleteReward(rewardId: string): Promise<Result<void>>;

  getRewardRequests(familyId: string): Promise<Result<RewardRequest[]>>;
  createRewardRequest(familyId: string, childId: string, request: { title: string; emoji: string }): Promise<Result<RewardRequest>>;
  updateRewardRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<Result<RewardRequest>>;
  deleteRewardRequest(requestId: string): Promise<Result<void>>;
}

