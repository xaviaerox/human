import type { SupabaseClient } from '@supabase/supabase-js';

import type { IGoalsAdapter, CreateGoalParams } from './IGoalsAdapter';
import type { Goal, GoalMicrotask, GoalWithMicrotasks, Result } from '@/types';
import { computeGoalProgress } from '@/lib/goals/MicrotaskEngine';
import type { ParsedMicrotask } from '@/lib/goals/MicrotaskEngine';

export class SupabaseGoalsAdapter implements IGoalsAdapter {
  constructor(private readonly client: SupabaseClient) {}

  async getGoals(childId: string): Promise<Result<GoalWithMicrotasks[]>> {
    const { data, error } = await this.client
      .from('goals')
      .select('*, microtasks:goal_microtasks(*)')
      .eq('child_id', childId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    if (error) return { ok: false, error: { code: 'fetch_failed', message: error.message } };

    const goals = (data ?? []).map(g => ({
      ...g,
      microtasks: (g.microtasks as GoalMicrotask[] ?? []).sort((a, b) => a.position - b.position),
      progress: computeGoalProgress(g.microtasks as GoalMicrotask[] ?? []),
    }));

    return { ok: true, data: goals };
  }

  async getGoal(goalId: string): Promise<Result<GoalWithMicrotasks>> {
    const { data, error } = await this.client
      .from('goals')
      .select('*, microtasks:goal_microtasks(*)')
      .eq('id', goalId)
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'not_found', message: error?.message ?? 'Not found' } };
    }

    const microtasks = (data.microtasks as GoalMicrotask[] ?? []).sort((a, b) => a.position - b.position);
    return { ok: true, data: { ...data, microtasks, progress: computeGoalProgress(microtasks) } };
  }

  async createGoal(params: CreateGoalParams): Promise<Result<GoalWithMicrotasks>> {
    const { microtasks: taskDrafts, ...goalData } = params;

    const { data: goal, error: goalError } = await this.client
      .from('goals')
      .insert({
        family_id:   goalData.family_id,
        child_id:    goalData.child_id,
        title:       goalData.title,
        description: goalData.description,
        why:         goalData.why,
        target_date: goalData.target_date,
        value_dimensions: goalData.value_dimensions,
        visibility:  goalData.visibility ?? 'child_and_parent',
        co_created:  goalData.co_created ?? false,
        created_by:  goalData.created_by,
      })
      .select()
      .single();

    if (goalError || !goal) {
      return { ok: false, error: { code: 'create_failed', message: goalError?.message ?? 'Failed' } };
    }

    let microtasks: GoalMicrotask[] = [];
    if (taskDrafts && taskDrafts.length > 0) {
      const { data: tasks, error: tasksError } = await this.client
        .from('goal_microtasks')
        .insert(taskDrafts.map(t => ({
          goal_id:          goal.id,
          position:         t.position,
          title:            t.title,
          description:      t.description,
          effort_level:     t.effort_level,
          spark_value:      t.spark_value,
          value_dimensions: t.value_dimensions,
          ai_generated:     true,
        })))
        .select();

      if (tasksError) {
        return { ok: false, error: { code: 'tasks_failed', message: tasksError.message } };
      }
      microtasks = (tasks ?? []).sort((a, b) => a.position - b.position);
    }

    return { ok: true, data: { ...goal, microtasks, progress: 0 } };
  }

  async updateGoal(goalId: string, updates: Partial<Pick<Goal, 'title' | 'description' | 'why' | 'status' | 'target_date' | 'visibility'>>): Promise<Result<Goal>> {
    const { data, error } = await this.client
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'update_failed', message: error?.message ?? 'Failed' } };
    }
    return { ok: true, data };
  }

  async completeMicrotask(microtaskId: string, completedBy: string): Promise<Result<GoalMicrotask>> {
    const { data, error } = await this.client
      .from('goal_microtasks')
      .update({ status: 'complete', completed_at: new Date().toISOString(), completed_by: completedBy })
      .eq('id', microtaskId)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'complete_failed', message: error?.message ?? 'Failed' } };
    }
    return { ok: true, data };
  }

  async addMicrotasks(goalId: string, microtasks: ParsedMicrotask[]): Promise<Result<GoalMicrotask[]>> {
    const { data, error } = await this.client
      .from('goal_microtasks')
      .insert(microtasks.map(t => ({
        goal_id:      goalId,
        position:     t.position,
        title:        t.title,
        description:  t.description,
        effort_level: t.effort_level,
        spark_value:  t.spark_value,
        value_dimensions: t.value_dimensions,
        ai_generated: true,
      })))
      .select();

    if (error) return { ok: false, error: { code: 'insert_failed', message: error.message } };
    return { ok: true, data: (data ?? []).sort((a, b) => a.position - b.position) };
  }
}
