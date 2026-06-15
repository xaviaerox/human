import { IProgressionAdapter } from './IProgressionAdapter';
import type { Result, ChildValueScore, ValueScoreEvent, ChildBadge, ValueDimensionId } from '@/types';

export class StaticProgressionAdapter implements IProgressionAdapter {
  private _scores: ChildValueScore[] = [
    { child_id: 'static-child-id', dimension_id: 'autonomy', score: 45, updated_at: new Date().toISOString() },
    { child_id: 'static-child-id', dimension_id: 'regulation', score: 32, updated_at: new Date().toISOString() },
    { child_id: 'static-child-id', dimension_id: 'empathy', score: 12, updated_at: new Date().toISOString() },
    { child_id: 'static-child-id', dimension_id: 'connection', score: 68, updated_at: new Date().toISOString() }, // Constancia
    { child_id: 'static-child-id', dimension_id: 'courage', score: 8, updated_at: new Date().toISOString() },     // Valentía
    { child_id: 'static-child-id', dimension_id: 'curiosity', score: 18, updated_at: new Date().toISOString() },   // Creatividad
  ];

  private _events: ValueScoreEvent[] = [
    {
      id: 'evt-1',
      child_id: 'static-child-id',
      dimension_id: 'connection',
      delta: 1,
      source_type: 'routine_complete',
      source_id: 'routine-1',
      note: 'Rutina completada: Mañana',
      occurred_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'evt-2',
      child_id: 'static-child-id',
      dimension_id: 'regulation',
      delta: 1,
      source_type: 'emotional_checkin',
      source_id: 'checkin-1',
      note: 'Registro de emoción tranquila',
      occurred_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  private _badges: ChildBadge[] = [
    {
      id: 'badge-1',
      child_id: 'static-child-id',
      family_id: 'static-family-id',
      dimension_id: 'connection',
      badge_tier: 'bronze',
      parent_note: '¡Excelente constancia en tus rutinas esta semana! Sigue así.',
      awarded_by: 'static-parent-id',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'badge-2',
      child_id: 'static-child-id',
      family_id: 'static-family-id',
      dimension_id: 'autonomy',
      badge_tier: 'bronze',
      parent_note: 'Has aprendido a prepararte solo para ir a dormir. ¡Súper autónomo!',
      awarded_by: 'static-parent-id',
      created_at: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  async getScores(childId: string): Promise<Result<ChildValueScore[]>> {
    const childScores = this._scores.filter(s => s.child_id === childId);
    return { ok: true, data: childScores };
  }

  async getEvents(childId: string, limit = 10): Promise<Result<ValueScoreEvent[]>> {
    const childEvents = this._events
      .filter(e => e.child_id === childId)
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .slice(0, limit);
    return { ok: true, data: childEvents };
  }

  async getBadges(childId: string): Promise<Result<ChildBadge[]>> {
    const childBadges = this._badges.filter(b => b.child_id === childId);
    return { ok: true, data: childBadges };
  }

  async awardBadge(
    childId: string,
    familyId: string,
    dimensionId: string,
    tier: 'bronze' | 'silver' | 'gold',
    note?: string,
    parentId?: string
  ): Promise<Result<ChildBadge>> {
    // Check if badge already exists for this tier and dimension
    const exists = this._badges.some(b => b.child_id === childId && b.dimension_id === dimensionId && b.badge_tier === tier);
    if (exists) {
      return { ok: false, error: { code: 'already_awarded', message: 'Insignia ya otorgada' } };
    }

    const badge: ChildBadge = {
      id: `static-badge-${Date.now()}`,
      child_id: childId,
      family_id: familyId,
      dimension_id: dimensionId as ValueDimensionId,
      badge_tier: tier,
      parent_note: note,
      awarded_by: parentId,
      created_at: new Date().toISOString(),
    };
    this._badges.push(badge);

    // Also increase score as a bonus for the badge
    const scoreIdx = this._scores.findIndex(s => s.child_id === childId && s.dimension_id === dimensionId);
    const bonusDelta = tier === 'bronze' ? 5 : tier === 'silver' ? 10 : 20;
    if (scoreIdx !== -1) {
      const current = this._scores[scoreIdx]!;
      this._scores[scoreIdx] = {
        ...current,
        score: current.score + bonusDelta,
        updated_at: new Date().toISOString(),
      };
    } else {
      this._scores.push({
        child_id: childId,
        dimension_id: dimensionId as ValueDimensionId,
        score: bonusDelta,
        updated_at: new Date().toISOString(),
      });
    }

    return { ok: true, data: badge };
  }
}
