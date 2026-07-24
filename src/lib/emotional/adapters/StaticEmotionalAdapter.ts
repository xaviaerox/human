// ============================================================
// MIRA — StaticEmotionalAdapter
// ============================================================

import type { IEmotionalAdapter, SubmitCheckinParams } from './IEmotionalAdapter';
import type {
  EmotionalCheckin,
  EmotionalWeeklySummary,
  Result,
} from '../../../types';
import type { CheckinPrompt } from '../EmotionModel';
import { DEFAULT_CHECKIN_SCHEDULE } from '../EmotionModel';

const SEED_CHECKINS: EmotionalCheckin[] = [
  {
    id: 'ci-1',
    child_id: 'static-child-1',
    emotion_word: 'Alegre',
    energy_level: 4,
    valence: 4,
    context_type: 'morning',
    prompted_by: 'app',
    occurred_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ci-2',
    child_id: 'static-child-1',
    emotion_word: 'Tranquilo/a',
    energy_level: 3,
    valence: 4,
    context_type: 'bedtime',
    prompted_by: 'app',
    occurred_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export class StaticEmotionalAdapter implements IEmotionalAdapter {
  private _checkins: EmotionalCheckin[] = [...SEED_CHECKINS];
  private _schedules: Map<string, CheckinPrompt[]> = new Map();
  private _idCounter = 0;

  private _nextId(): string { return `ci-static-${++this._idCounter}`; }

  async submitCheckin(params: SubmitCheckinParams): Promise<Result<EmotionalCheckin>> {
    const checkin: EmotionalCheckin = {
      id: this._nextId(),
      child_id: params.child_id,
      emotion_word: params.emotion.emotion_word,
      energy_level: params.emotion.energy_level,
      valence: params.emotion.valence,
      context_type: params.context_type,
      context_id: params.context_id,
      note: params.note,
      prompted_by: params.prompted_by,
      occurred_at: new Date().toISOString(),
    };
    this._checkins.push(checkin);
    return { ok: true, data: checkin };
  }

  async getRecentCheckins(childId: string, limit = 10): Promise<Result<EmotionalCheckin[]>> {
    const results = this._checkins
      .filter(c => c.child_id === childId)
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .slice(0, limit);
    return { ok: true, data: results };
  }

  async getLastCheckin(childId: string): Promise<Result<EmotionalCheckin | null>> {
    const sorted = this._checkins
      .filter(c => c.child_id === childId)
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    return { ok: true, data: sorted[0] ?? null };
  }

  async getWeeklySummaries(childId: string, weeksBack = 4): Promise<Result<EmotionalWeeklySummary[]>> {
    const summaries: EmotionalWeeklySummary[] = [];
    const now = new Date();

    for (let w = weeksBack - 1; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekCheckins = this._checkins.filter(c => {
        const t = new Date(c.occurred_at).getTime();
        return c.child_id === childId && t >= weekStart.getTime() && t < weekEnd.getTime();
      });

      if (weekCheckins.length === 0) continue;

      const avgEnergy = weekCheckins.reduce((s, c) => s + c.energy_level, 0) / weekCheckins.length;
      const avgValence = weekCheckins.reduce((s, c) => s + c.valence, 0) / weekCheckins.length;

      const wordCounts: Record<string, number> = {};
      weekCheckins.forEach(c => {
        if (c.emotion_word) wordCounts[c.emotion_word] = (wordCounts[c.emotion_word] ?? 0) + 1;
      });
      const mostCommon = Object.entries(wordCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

      summaries.push({
        child_id: childId,
        week_start: weekStart.toISOString().split('T')[0]!,
        avg_energy: Math.round(avgEnergy * 10) / 10,
        avg_valence: Math.round(avgValence * 10) / 10,
        checkin_count: weekCheckins.length,
        most_common_emotion: mostCommon,
      });
    }

    return { ok: true, data: summaries };
  }

  async getCheckinSchedule(childId: string): Promise<Result<CheckinPrompt[]>> {
    return {
      ok: true,
      data: this._schedules.get(childId) ?? [...DEFAULT_CHECKIN_SCHEDULE],
    };
  }

  async updateCheckinSchedule(childId: string, schedule: CheckinPrompt[]): Promise<Result<CheckinPrompt[]>> {
    this._schedules.set(childId, schedule);
    return { ok: true, data: schedule };
  }
}
