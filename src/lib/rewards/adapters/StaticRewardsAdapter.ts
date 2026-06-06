// ============================================================
// MIRA — StaticRewardsAdapter
// ============================================================

import type { IRewardsAdapter } from './IRewardsAdapter';
import type { Reward, RewardRequest, Result } from '@/types';

const STATIC_REWARDS: Reward[] = [
  { id: 'dinner', family_id: 'static-family-1', title: 'Elegir la cena', cost: 5, emoji: '🍕', cooldown_hours: 0 },
  { id: 'screen', family_id: 'static-family-1', title: '30 min de pantalla extra', cost: 10, emoji: '🎮', cooldown_hours: 0 },
  { id: 'park', family_id: 'static-family-1', title: 'Tarde de parque', cost: 15, emoji: '🛝', cooldown_hours: 0 },
  { id: 'movie', family_id: 'static-family-1', title: 'Elegir película familiar', cost: 20, emoji: '🍿', cooldown_hours: 0 },
];

export class StaticRewardsAdapter implements IRewardsAdapter {
  private _rewards: Reward[] = [...STATIC_REWARDS];
  private _requests: RewardRequest[] = [];

  async getRewards(familyId: string): Promise<Result<Reward[]>> {
    // If the family is not the static one, initialize it with a copy of static rewards for convenience
    const familyRewards = this._rewards.filter(r => r.family_id === familyId);
    if (familyRewards.length === 0) {
      // Seed with copies of demo rewards for the new family
      const seeds = STATIC_REWARDS.map(r => ({
        ...r,
        id: Math.random().toString(36).substr(2, 9),
        family_id: familyId
      }));
      this._rewards.push(...seeds);
      return { ok: true, data: seeds };
    }
    return { ok: true, data: familyRewards };
  }

  async createReward(familyId: string, reward: Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>): Promise<Result<Reward>> {
    const newReward: Reward = {
      id: Math.random().toString(36).substr(2, 9),
      family_id: familyId,
      ...reward,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this._rewards.push(newReward);
    return { ok: true, data: newReward };
  }

  async updateReward(rewardId: string, updates: Partial<Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>>): Promise<Result<Reward>> {
    const reward = this._rewards.find(r => r.id === rewardId);
    if (!reward) {
      return { ok: false, error: { code: 'not_found', message: 'Reward not found' } };
    }
    Object.assign(reward, updates, { updated_at: new Date().toISOString() });
    return { ok: true, data: reward };
  }

  async deleteReward(rewardId: string): Promise<Result<void>> {
    const index = this._rewards.findIndex(r => r.id === rewardId);
    if (index === -1) {
      return { ok: false, error: { code: 'not_found', message: 'Reward not found' } };
    }
    this._rewards.splice(index, 1);
    return { ok: true, data: undefined };
  }

  async getRewardRequests(familyId: string): Promise<Result<RewardRequest[]>> {
    const familyRequests = this._requests.filter(r => r.family_id === familyId);
    return { ok: true, data: familyRequests };
  }

  async createRewardRequest(familyId: string, childId: string, request: { title: string; emoji: string }): Promise<Result<RewardRequest>> {
    const newRequest: RewardRequest = {
      id: Math.random().toString(36).substr(2, 9),
      family_id: familyId,
      child_id: childId,
      title: request.title,
      emoji: request.emoji,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      child: {
        display_name: 'Mikel' // Mock display name for static adapter
      }
    };
    this._requests.push(newRequest);
    return { ok: true, data: newRequest };
  }

  async updateRewardRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<Result<RewardRequest>> {
    const req = this._requests.find(r => r.id === requestId);
    if (!req) {
      return { ok: false, error: { code: 'not_found', message: 'Request not found' } };
    }
    req.status = status;
    req.updated_at = new Date().toISOString();
    return { ok: true, data: req };
  }

  async deleteRewardRequest(requestId: string): Promise<Result<void>> {
    const index = this._requests.findIndex(r => r.id === requestId);
    if (index === -1) {
      return { ok: false, error: { code: 'not_found', message: 'Request not found' } };
    }
    this._requests.splice(index, 1);
    return { ok: true, data: undefined };
  }
}
