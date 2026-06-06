// ============================================================
// MIRA — StaticGoalsAdapter
// ============================================================

import type { IGoalsAdapter, CreateGoalParams } from './IGoalsAdapter';
import type { Goal, GoalMicrotask, GoalWithMicrotasks, Result } from '../../../types';
import { enrichGoal } from '../MicrotaskEngine';

const STATIC_GOALS: GoalWithMicrotasks[] = [
  {
    id: 'goal-1',
    family_id: 'static-family-1',
    child_id: 'static-child-1',
    title: 'Learn to tie my shoes',
    description: 'I want to do it by myself',
    why: 'So I don\'t need help every morning',
    status: 'active',
    value_dimensions: ['autonomy', 'courage'],
    total_sparks: 10,
    visibility: 'child_and_parent',
    co_created: true,
    created_by: 'static-parent-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    progress: 33,
    microtasks: [
      {
        id: 'mt-1', goal_id: 'goal-1', position: 1,
        title: 'Watch how it\'s done once',
        effort_level: 'easy', spark_value: 1,
        value_dimensions: ['curiosity'],
        status: 'complete', ai_generated: false,
        completed_at: new Date().toISOString(),
        completed_by: 'static-child-1',
      },
      {
        id: 'mt-2', goal_id: 'goal-1', position: 2,
        title: 'Try making the first loop',
        effort_level: 'medium', spark_value: 3,
        value_dimensions: ['courage'],
        status: 'in_progress', ai_generated: false,
      },
      {
        id: 'mt-3', goal_id: 'goal-1', position: 3,
        title: 'Tie my shoes all the way through',
        effort_level: 'stretch', spark_value: 6,
        value_dimensions: ['autonomy', 'courage'],
        status: 'pending', ai_generated: false,
      },
    ],
  },
];

export class StaticGoalsAdapter implements IGoalsAdapter {
  private _goals: GoalWithMicrotasks[] = [...STATIC_GOALS];
  private _idCounter = 200;

  private _nextId(): string { return `static-${++this._idCounter}`; }

  async getGoals(childId: string): Promise<Result<GoalWithMicrotasks[]>> {
    const results = this._goals.filter(
      g => g.child_id === childId && g.status !== 'archived'
    );
    return { ok: true, data: results };
  }

  async getGoal(goalId: string): Promise<Result<GoalWithMicrotasks>> {
    const goal = this._goals.find(g => g.id === goalId);
    if (!goal) return { ok: false, error: { code: 'not_found', message: `Goal ${goalId} not found` } };
    return { ok: true, data: goal };
  }

  async createGoal(params: CreateGoalParams): Promise<Result<GoalWithMicrotasks>> {
    const id = this._nextId();
    const microtasks: GoalMicrotask[] = (params.microtasks ?? []).map((m, i) => ({
      id: this._nextId(),
      goal_id: id,
      position: m.position ?? i + 1,
      title: m.title,
      description: m.description,
      effort_level: m.effort_level,
      spark_value: m.spark_value,
      value_dimensions: m.value_dimensions,
      status: 'pending' as const,
      ai_generated: true,
      
    }));

    const goal: GoalWithMicrotasks = {
      id,
      family_id: params.family_id,
      child_id: params.child_id,
      title: params.title,
      description: params.description,
      why: params.why,
      status: 'active',
      target_date: params.target_date,
      value_dimensions: params.value_dimensions,
      total_sparks: microtasks.reduce((s, m) => s + m.spark_value, 0),
      visibility: params.visibility ?? 'child_and_parent',
      co_created: params.co_created ?? false,
      created_by: params.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      microtasks,
      progress: 0,
    };

    this._goals.push(goal);
    return { ok: true, data: goal };
  }

  async updateGoal(
    goalId: string,
    updates: Partial<Pick<Goal, 'title' | 'description' | 'why' | 'status' | 'target_date' | 'visibility'>>
  ): Promise<Result<Goal>> {
    const idx = this._goals.findIndex(g => g.id === goalId);
    if (idx === -1) return { ok: false, error: { code: 'not_found', message: 'Goal not found' } };
    this._goals[idx] = { ...this._goals[idx]!, ...updates, updated_at: new Date().toISOString() };
    return { ok: true, data: this._goals[idx]! };
  }

  async completeMicrotask(microtaskId: string, completedBy: string): Promise<Result<GoalMicrotask>> {
    for (const goal of this._goals) {
      const idx = goal.microtasks.findIndex(t => t.id === microtaskId);
      if (idx !== -1) {
        const updated: GoalMicrotask = {
          ...goal.microtasks[idx]!,
          status: 'complete',
          completed_at: new Date().toISOString(),
          completed_by: completedBy,
        };
        goal.microtasks[idx] = updated;

        // Update progress
        goal.progress = Math.round(
          (goal.microtasks.filter(t => t.status === 'complete').length / goal.microtasks.length) * 100
        );

        // Auto-complete goal if all done
        if (goal.microtasks.every(t => t.status === 'complete')) {
          goal.status = 'completed';
        }

        return { ok: true, data: updated };
      }
    }
    return { ok: false, error: { code: 'not_found', message: `Microtask ${microtaskId} not found` } };
  }

  async uncompleteMicrotask(microtaskId: string): Promise<Result<GoalMicrotask>> {
    for (const goal of this._goals) {
      const idx = goal.microtasks.findIndex(t => t.id === microtaskId);
      if (idx !== -1) {
        const updated: GoalMicrotask = {
          ...goal.microtasks[idx]!,
          status: 'pending',
          completed_at: undefined,
          completed_by: undefined,
        };
        goal.microtasks[idx] = updated;

        // Update progress
        goal.progress = Math.round(
          (goal.microtasks.filter(t => t.status === 'complete').length / goal.microtasks.length) * 100
        );

        // Reset goal status if it was completed
        if (goal.status === 'completed') {
          goal.status = 'active';
        }

        return { ok: true, data: updated };
      }
    }
    return { ok: false, error: { code: 'not_found', message: `Microtask ${microtaskId} not found` } };
  }

  async addMicrotasks(goalId: string, microtasks: import('../MicrotaskEngine').ParsedMicrotask[]): Promise<Result<GoalMicrotask[]>> {
    const goal = this._goals.find(g => g.id === goalId);
    if (!goal) return { ok: false, error: { code: 'not_found', message: 'Goal not found' } };

    const created: GoalMicrotask[] = microtasks.map(m => ({
      id: this._nextId(),
      goal_id: goalId,
      position: m.position,
      title: m.title,
      description: m.description,
      effort_level: m.effort_level,
      spark_value: m.spark_value,
      value_dimensions: m.value_dimensions,
      status: 'pending' as const,
      ai_generated: true,
    }));

    goal.microtasks.push(...created);
    goal.total_sparks = goal.microtasks.reduce((s, t) => s + t.spark_value, 0);
    return { ok: true, data: created };
  }
}
