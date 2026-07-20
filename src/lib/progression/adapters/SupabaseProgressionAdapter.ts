import type { SupabaseClient } from '@supabase/supabase-js';
import { IProgressionAdapter } from './IProgressionAdapter';
import type { Result, ChildValueScore, ValueScoreEvent, ChildBadge } from '@/types';

export class SupabaseProgressionAdapter implements IProgressionAdapter {
  constructor(private readonly client: SupabaseClient) {}

  async getScores(childId: string): Promise<Result<ChildValueScore[]>> {
    const { data, error } = await this.client
      .from('child_value_scores')
      .select('*')
      .eq('child_id', childId);

    if (error) {
      return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    }
    return { ok: true, data: (data as ChildValueScore[]) ?? [] };
  }

  async getEvents(childId: string, limit = 10): Promise<Result<ValueScoreEvent[]>> {
    const { data, error } = await this.client
      .from('value_score_events')
      .select('*')
      .eq('child_id', childId)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    }
    return { ok: true, data: (data as ValueScoreEvent[]) ?? [] };
  }

  async getBadges(childId: string): Promise<Result<ChildBadge[]>> {
    const { data, error } = await this.client
      .from('child_badges')
      .select('*')
      .eq('child_id', childId);

    if (error) {
      return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    }
    return { ok: true, data: (data as ChildBadge[]) ?? [] };
  }

  async awardBadge(
    childId: string,
    familyId: string,
    dimensionId: string,
    tier: 'bronze' | 'silver' | 'gold',
    note?: string,
    parentId?: string
  ): Promise<Result<ChildBadge>> {
    // Check if the badge already exists
    const { data: existing, error: checkError } = await this.client
      .from('child_badges')
      .select('id')
      .eq('child_id', childId)
      .eq('dimension_id', dimensionId)
      .eq('badge_tier', tier)
      .maybeSingle();

    if (checkError) {
      return { ok: false, error: { code: 'check_failed', message: checkError.message } };
    }
    if (existing) {
      return { ok: false, error: { code: 'already_awarded', message: 'Esta insignia ya ha sido otorgada.' } };
    }

    // Insert new badge
    const { data, error } = await this.client
      .from('child_badges')
      .insert({
        child_id: childId,
        family_id: familyId,
        dimension_id: dimensionId,
        badge_tier: tier,
        parent_note: note,
        awarded_by: parentId,
      })
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'award_failed', message: error?.message ?? 'Failed to award badge' } };
    }

    return { ok: true, data: data as ChildBadge };
  }
}
