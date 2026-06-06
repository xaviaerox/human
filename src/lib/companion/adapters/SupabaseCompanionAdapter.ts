// ============================================================
// MIRA — SupabaseCompanionAdapter
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

import type { ICompanionAdapter } from './ICompanionAdapter';
import type { Companion, CompanionInteraction, CompanionInteractionType, Result } from '../../../types';
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

    // Update bonding score (DB trigger handles stage progression)
    const { error: updateError } = await this.client
      .from('companions')
      .update({ bonding_score: this.client.rpc as unknown as number })
      .eq('id', companionId);

    // Use RPC to increment atomically
    await this.client.rpc('award_sparks' as never, {} as never); // placeholder — use raw SQL increment via edge function in prod

    // For now: read current, increment, write back
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
}
