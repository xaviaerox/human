// ============================================================
// MIRA — IGoalsAdapter
// ============================================================

import type { Goal, GoalMicrotask, GoalWithMicrotasks, Result } from '@/types';
import type { ParsedMicrotask } from '@/lib/goals/MicrotaskEngine';

export interface CreateGoalParams {
  family_id: string;
  child_id: string;
  title: string;
  description?: string;
  why?: string;
  status?: Goal['status'];
  target_date?: string;
  value_dimensions?: Goal['value_dimensions'];
  visibility?: Goal['visibility'];
  co_created?: boolean;
  one_per_day?: boolean;
  created_by: string;
  microtasks?: ParsedMicrotask[];
}

export interface IGoalsAdapter {
  /** Get all active goals for a child */
  getGoals(childId: string): Promise<Result<GoalWithMicrotasks[]>>;

  /** Get a single goal with microtasks */
  getGoal(goalId: string): Promise<Result<GoalWithMicrotasks>>;

  /** Create a goal with optional pre-decomposed microtasks */
  createGoal(params: CreateGoalParams): Promise<Result<GoalWithMicrotasks>>;

  /** Update goal metadata */
  updateGoal(
    goalId: string,
    updates: Partial<Pick<Goal, 'title' | 'description' | 'why' | 'status' | 'target_date' | 'visibility' | 'co_created' | 'child_id' | 'one_per_day'>>,
    microtasks?: Omit<GoalMicrotask, 'id' | 'goal_id'>[]
  ): Promise<Result<GoalWithMicrotasks>>;

  /** Complete a microtask */
  completeMicrotask(microtaskId: string, completedBy: string): Promise<Result<GoalMicrotask>>;

  /** Uncomplete a microtask */
  uncompleteMicrotask(microtaskId: string): Promise<Result<GoalMicrotask>>;

  /** Add AI-generated microtasks to an existing goal */
  addMicrotasks(goalId: string, microtasks: ParsedMicrotask[]): Promise<Result<GoalMicrotask[]>>;
}
