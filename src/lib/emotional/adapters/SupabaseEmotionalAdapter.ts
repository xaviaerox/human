// ============================================================
// MIRA — SupabaseEmotionalAdapter
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

import type { IEmotionalAdapter, SubmitCheckinParams } from './IEmotionalAdapter';
import type { EmotionalCheckin, EmotionalWeeklySummary, Result } from '../../../types';
import type { CheckinPrompt } from '../EmotionModel';
import { DEFAULT_CHECKIN_SCHEDULE } from '../EmotionModel';

export class SupabaseEmotionalAdapter implements IEmotionalAdapter {
  constructor(private readonly client: SupabaseClient) {}

  async submitCheckin(params: SubmitCheckinParams): Promise<Result<EmotionalCheckin>> {
    const { data, error } = await this.client
      .from('emotional_checkins')
      .insert({
        child_id: params.child_id,
        emotion_word: params.emotion.emotion_word,
        energy_level: params.emotion.energy_level,
        valence: params.emotion.valence,
        context_type: params.context_type,
        context_id: params.context_id,
        note: params.note,
        prompted_by: params.prompted_by,
      })
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'submit_failed', message: error?.message ?? 'Failed' } };
    }
    return { ok: true, data };
  }

  async getRecentCheckins(childId: string, limit = 10): Promise<Result<EmotionalCheckin[]>> {
    const { data, error } = await this.client
      .from('emotional_checkins')
      .select('*')
      .eq('child_id', childId)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    return { ok: true, data: data ?? [] };
  }

  async getLastCheckin(childId: string): Promise<Result<EmotionalCheckin | null>> {
    const { data, error } = await this.client
      .from('emotional_checkins')
      .select('*')
      .eq('child_id', childId)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    return { ok: true, data };
  }

  async getWeeklySummaries(childId: string, weeksBack = 4): Promise<Result<EmotionalWeeklySummary[]>> {
    const since = new Date();
    since.setDate(since.getDate() - weeksBack * 7);

    const { data, error } = await this.client
      .from('emotional_weekly_summary' as never)
      .select('*')
      .eq('child_id', childId)
      .gte('week_start', since.toISOString().split('T')[0])
      .order('week_start', { ascending: true });

    if (error) return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    return { ok: true, data: (data ?? []) as EmotionalWeeklySummary[] };
  }

  async getCheckinSchedule(childId: string): Promise<Result<CheckinPrompt[]>> {
    const { data, error } = await this.client
      .from('checkin_schedules')
      .select('prompts')
      .eq('child_id', childId)
      .maybeSingle();

    if (error) return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    return { ok: true, data: (data?.prompts as CheckinPrompt[]) ?? DEFAULT_CHECKIN_SCHEDULE };
  }

  async updateCheckinSchedule(childId: string, schedule: CheckinPrompt[]): Promise<Result<CheckinPrompt[]>> {
    const { error } = await this.client
      .from('checkin_schedules')
      .upsert({ child_id: childId, prompts: schedule })
      .eq('child_id', childId);

    if (error) return { ok: false, error: { code: 'update_failed', message: error.message } };
    return { ok: true, data: schedule };
  }
}
