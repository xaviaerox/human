// ============================================================
// MIRA — SupabaseCompanionAdapter
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

import type { ICompanionAdapter } from './ICompanionAdapter';
import type { Companion, CompanionInteraction, CompanionInteractionType, CompanionMemory, Result } from '../../../types';
import { BONDING_DELTAS } from '../CompanionEngine';

export class SupabaseCompanionAdapter implements ICompanionAdapter {
  constructor(private readonly client: SupabaseClient) {}

  async getCompanion(childId: string): Promise<Result<Companion | null>> {
    const { data, error } = await this.client
      .from('companions')
      .select('*')
      .eq('child_id', childId)
      .maybeSingle();

    if (error) return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    return { ok: true, data };
  }

  async createCompanion(childId: string, name: string): Promise<Result<Companion>> {
    const { data, error } = await this.client.rpc('create_companion', {
      p_child_id: childId,
      p_name: name,
    });

    if (error || !data) {
      return { ok: false, error: { code: 'create_failed', message: error?.message ?? 'Failed' } };
    }
    return { ok: true, data };
  }

  async nameCompanion(companionId: string, name: string): Promise<Result<Companion>> {
    const { data, error } = await this.client
      .from('companions')
      .update({ name })
      .eq('id', companionId)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'update_failed', message: error?.message ?? 'Failed' } };
    }
    return { ok: true, data };
  }

  async recordInteraction(
    companionId: string,
    childId: string,
    type: CompanionInteractionType,
    context: Record<string, unknown> = {}
  ): Promise<Result<CompanionInteraction>> {
    const delta = BONDING_DELTAS[type];

    // Insert interaction log
    const { data: interaction, error: interactionError } = await this.client
      .from('companion_interactions')
      .insert({ companion_id: companionId, child_id: childId, type, bonding_delta: delta, context })
      .select()
      .single();

    if (interactionError || !interaction) {
      return { ok: false, error: { code: 'interaction_failed', message: interactionError?.message ?? 'Failed' } };
    }

    // Read current bonding_score, increment, write back
    const { data: current } = await this.client
      .from('companions')
      .select('bonding_score')
      .eq('id', companionId)
      .single();

    if (current) {
      await this.client
        .from('companions')
        .update({ bonding_score: current.bonding_score + delta })
        .eq('id', companionId);
    }

    return { ok: true, data: interaction };
  }

  async getInteractionCounts(companionId: string): Promise<Result<Record<CompanionInteractionType, number>>> {
    const { data, error } = await this.client
      .from('companion_interactions')
      .select('type')
      .eq('companion_id', companionId);

    if (error) return { ok: false, error: { code: 'fetch_failed', message: error.message } };

    const all: CompanionInteractionType[] = [
      'routine_complete', 'emotional_checkin', 'goal_step_complete',
      'free_interaction', 'spark_received',
    ];

    const counts = Object.fromEntries(
      all.map(type => [type, (data ?? []).filter(r => r.type === type).length])
    ) as Record<CompanionInteractionType, number>;

    return { ok: true, data: counts };
  }

  async updateCompanion(companionId: string, updates: Partial<Companion>): Promise<Result<Companion>> {
    const { data, error } = await this.client
      .from('companions')
      .update(updates)
      .eq('id', companionId)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'update_failed', message: error?.message ?? 'Failed' } };
    }
    return { ok: true, data };
  }

  subscribeToCompanion(childId: string, callback: (companion: Companion) => void): () => void {
    // Initial fetch
    this.getCompanion(childId).then(result => {
      if (result.ok && result.data) callback(result.data);
    });

    const channel = this.client
      .channel(`companion:${childId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'companions', filter: `child_id=eq.${childId}` },
        payload => callback(payload.new as Companion)
      )
      .subscribe();

    return () => { this.client.removeChannel(channel); };
  }

  async getMemories(childId: string): Promise<Result<CompanionMemory[]>> {
    const { data, error } = await this.client
      .from('companion_memories')
      .select('*')
      .eq('child_id', childId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    }
    return { ok: true, data: data as CompanionMemory[] ?? [] };
  }

  async createMemory(
    childId: string,
    companionId: string,
    type: 'routine_streak_milestone' | 'difficult_checkin' | 'adventure_complete' | 'parent_badge_award',
    metadata: Record<string, unknown>
  ): Promise<Result<CompanionMemory>> {
    const { data, error } = await this.client
      .from('companion_memories')
      .insert({
        child_id: childId,
        companion_id: companionId,
        memory_type: type,
        metadata,
      })
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'create_failed', message: error?.message ?? 'Failed to save memory' } };
    }
    return { ok: true, data: data as CompanionMemory };
  }
}

