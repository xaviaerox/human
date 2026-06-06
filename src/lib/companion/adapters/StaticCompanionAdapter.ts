// ============================================================
// MIRA — StaticCompanionAdapter
// ============================================================

import type { ICompanionAdapter } from './ICompanionAdapter';
import type { Companion, CompanionInteraction, CompanionInteractionType, Result } from '../../../types';
import { BONDING_DELTAS, advanceStage, computeNewTraits } from '../CompanionEngine';

const DEFAULT_COMPANION: Companion = {
  id: 'companion-1',
  child_id: 'static-child-1',
  name: 'Lumi',
  stage: 'sprout',
  stage_unlocked_at: { egg: '2024-01-01T00:00:00Z', sprout: '2024-01-10T00:00:00Z' },
  bonding_score: 30,
  emotional_responsiveness: 65,
  personality_traits: ['curious'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export class StaticCompanionAdapter implements ICompanionAdapter {
  private _companion: Companion = { ...DEFAULT_COMPANION };
  private _interactions: CompanionInteraction[] = [];
  private _listeners: Array<(companion: Companion) => void> = [];
  private _idCounter = 0;

  private _nextId(): string { return `ci-${++this._idCounter}`; }

  async getCompanion(childId: string): Promise<Result<Companion | null>> {
    if (this._companion.child_id !== childId) return { ok: true, data: null };
    return { ok: true, data: { ...this._companion } };
  }

  async createCompanion(childId: string, name: string): Promise<Result<Companion>> {
    this._companion = {
      id: 'companion-1',
      child_id: childId,
      name,
      stage: 'egg',
      stage_unlocked_at: { egg: new Date().toISOString() },
      bonding_score: 5,
      emotional_responsiveness: 50,
      personality_traits: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this._emit();
    return { ok: true, data: { ...this._companion } };
  }

  async nameCompanion(companionId: string, name: string): Promise<Result<Companion>> {
    this._companion = { ...this._companion, name, updated_at: new Date().toISOString() };
    this._emit();
    return { ok: true, data: { ...this._companion } };
  }

  async recordInteraction(
    companionId: string,
    childId: string,
    type: CompanionInteractionType,
    context: Record<string, unknown> = {}
  ): Promise<Result<CompanionInteraction>> {
    const delta = BONDING_DELTAS[type];
    const newScore = this._companion.bonding_score + delta;
    const newStage = advanceStage(this._companion, newScore);

    // Compute trait unlocks
    const counts = await this.getInteractionCounts(companionId);
    const countData = counts.ok ? counts.data : {} as Record<CompanionInteractionType, number>;
    const newTraits = computeNewTraits(
      { ...this._companion, bonding_score: newScore, stage: newStage },
      countData
    );

    this._companion = {
      ...this._companion,
      bonding_score: newScore,
      stage: newStage,
      personality_traits: [...this._companion.personality_traits, ...newTraits],
      updated_at: new Date().toISOString(),
    };

    const interaction: CompanionInteraction = {
      id: this._nextId(),
      companion_id: companionId,
      child_id: childId,
      type,
      bonding_delta: delta,
      context,
      occurred_at: new Date().toISOString(),
    };

    this._interactions.push(interaction);
    this._emit();
    return { ok: true, data: interaction };
  }

  async getInteractionCounts(companionId: string): Promise<Result<Record<CompanionInteractionType, number>>> {
    const all: CompanionInteractionType[] = [
      'routine_complete', 'emotional_checkin', 'goal_step_complete',
      'free_interaction', 'spark_received',
    ];
    const counts = Object.fromEntries(
      all.map(type => [type, this._interactions.filter(i => i.type === type).length])
    ) as Record<CompanionInteractionType, number>;
    return { ok: true, data: counts };
  }

  subscribeToCompanion(childId: string, callback: (companion: Companion) => void): () => void {
    this._listeners.push(callback);
    setTimeout(() => callback({ ...this._companion }), 0);
    return () => { this._listeners = this._listeners.filter(l => l !== callback); };
  }

  private _emit(): void {
    this._listeners.forEach(l => l({ ...this._companion }));
  }
}
