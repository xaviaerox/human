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

  async getWeeklySummaries(childId: string, weeksBack = 8): Promise<Result<EmotionalWeeklySummary[]>> {
    const since = new Date();
    since.setDate(since.getDate() - weeksBack * 7);

    // Fetch directly from emotional_checkins table so live data is always included
    const { data: checkins, error: checkinError } = await this.client
      .from('emotional_checkins')
      .select('*')
      .eq('child_id', childId)
      .gte('occurred_at', since.toISOString())
      .order('occurred_at', { ascending: true });

    if (!checkinError && checkins && checkins.length > 0) {
      const weekMap = new Map<string, EmotionalCheckin[]>();

      checkins.forEach((c: EmotionalCheckin) => {
        const d = new Date(c.occurred_at);
        const day = d.getDay();
        const diff = d.getDate() - day;
        const weekStart = new Date(d);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().split('T')[0]!;

        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, []);
        }
        weekMap.get(weekKey)!.push(c);
      });

      const summaries: EmotionalWeeklySummary[] = [];
      weekMap.forEach((list, week_start) => {
        const avgEnergy = list.reduce((s, c) => s + c.energy_level, 0) / list.length;
        const avgValence = list.reduce((s, c) => s + c.valence, 0) / list.length;

        const wordCounts: Record<string, number> = {};
        list.forEach(c => {
          if (c.emotion_word) wordCounts[c.emotion_word] = (wordCounts[c.emotion_word] ?? 0) + 1;
        });
        const mostCommon = Object.entries(wordCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

        summaries.push({
          child_id: childId,
          week_start,
          avg_energy: Math.round(avgEnergy * 10) / 10,
          avg_valence: Math.round(avgValence * 10) / 10,
          checkin_count: list.length,
          most_common_emotion: mostCommon,
        });
      });

      summaries.sort((a, b) => a.week_start.localeCompare(b.week_start));
      return { ok: true, data: summaries };
    }

    // Fallback to materialized view query
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
