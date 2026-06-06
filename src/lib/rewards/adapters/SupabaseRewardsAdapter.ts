// ============================================================
// MIRA — SupabaseRewardsAdapter
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js';
import type { IRewardsAdapter } from './IRewardsAdapter';
import type { Reward, Result } from '@/types';

export class SupabaseRewardsAdapter implements IRewardsAdapter {
  constructor(private readonly client: SupabaseClient) {}

  async getRewards(familyId: string): Promise<Result<Reward[]>> {
    const { data, error } = await this.client
      .from('rewards')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true });

    if (error) {
      return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    }

    return { ok: true, data: data ?? [] };
  }

  async createReward(familyId: string, reward: Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>): Promise<Result<Reward>> {
    const { data, error } = await this.client
      .from('rewards')
      .insert({ family_id: familyId, ...reward })
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'create_failed', message: error?.message ?? 'Failed to create reward' } };
    }

    return { ok: true, data };
  }

  async updateReward(rewardId: string, updates: Partial<Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>>): Promise<Result<Reward>> {
    const { data, error } = await this.client
      .from('rewards')
      .update(updates)
      .eq('id', rewardId)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'update_failed', message: error?.message ?? 'Failed to update reward' } };
    }

    return { ok: true, data };
  }

  async deleteReward(rewardId: string): Promise<Result<void>> {
    const { error } = await this.client
      .from('rewards')
      .delete()
      .eq('id', rewardId);

    if (error) {
      return { ok: false, error: { code: 'delete_failed', message: error.message } };
    }

    return { ok: true, data: undefined };
  }
}
