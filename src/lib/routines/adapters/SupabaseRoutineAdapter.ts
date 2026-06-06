// ============================================================
// MIRA — SupabaseRoutineAdapter
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

import type { IRoutineAdapter, CreateRoutineParams, CompleteRoutineParams } from './IRoutineAdapter';
import type { Routine, RoutineStep, RoutineCompletion, RoutineWithSteps, Result } from '../../../types';

const today = () => new Date().toISOString().split('T')[0]!;

export class SupabaseRoutineAdapter implements IRoutineAdapter {
  constructor(private readonly client: SupabaseClient) {}

  async getRoutines(familyId: string, childId?: string): Promise<Result<RoutineWithSteps[]>> {
    let query = this.client
      .from('routines')
      .select('*, steps:routine_steps(*)')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('time_of_day', { ascending: true });

    if (childId) {
      query = query.or(`child_id.is.null,child_id.eq.${childId}`);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: { code: 'fetch_failed', message: error.message } };

    const routines = (data ?? []).map(r => ({
      ...r,
      steps: (r.steps as RoutineStep[] ?? []).sort((a, b) => a.position - b.position),
    }));

    return { ok: true, data: routines };
  }

  async getRoutine(routineId: string): Promise<Result<RoutineWithSteps>> {
    const { data, error } = await this.client
      .from('routines')
      .select('*, steps:routine_steps(*)')
      .eq('id', routineId)
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'not_found', message: error?.message ?? 'Not found' } };
    }

    return {
      ok: true,
      data: {
        ...data,
        steps: (data.steps as RoutineStep[] ?? []).sort((a, b) => a.position - b.position),
      },
    };
  }

  async createRoutine(params: CreateRoutineParams): Promise<Result<RoutineWithSteps>> {
    const { steps, ...routineData } = params;

    const { data: routine, error: routineError } = await this.client
      .from('routines')
      .insert({
        family_id: routineData.family_id,
        child_id: routineData.child_id,
        title: routineData.title,
        description: routineData.description,
        schedule_type: routineData.schedule_type,
        schedule_days: routineData.schedule_days,
        time_of_day: routineData.time_of_day,
        scheduled_time: routineData.scheduled_time,
        is_active: true,
        color_token: routineData.color_token ?? 'calm',
        icon_key: routineData.icon_key,
        value_dimensions: routineData.value_dimensions,
        spark_value: routineData.spark_value ?? 1,
        created_by: routineData.created_by,
      })
      .select()
      .single();

    if (routineError || !routine) {
      return { ok: false, error: { code: 'create_failed', message: routineError?.message ?? 'Create failed' } };
    }

    let createdSteps: RoutineStep[] = [];
    if (steps && steps.length > 0) {
      const { data: stepsData, error: stepsError } = await this.client
        .from('routine_steps')
        .insert(steps.map(s => ({ ...s, routine_id: routine.id })))
        .select();

      if (stepsError) {
        return { ok: false, error: { code: 'steps_create_failed', message: stepsError.message } };
      }
      createdSteps = (stepsData ?? []).sort((a, b) => a.position - b.position);
    }

    return { ok: true, data: { ...routine, steps: createdSteps } };
  }

  async updateRoutine(
    routineId: string,
    updates: Partial<Omit<Routine, 'id' | 'family_id' | 'created_at'>>
  ): Promise<Result<Routine>> {
    const { data, error } = await this.client
      .from('routines')
      .update(updates)
      .eq('id', routineId)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'update_failed', message: error?.message ?? 'Update failed' } };
    }
    return { ok: true, data };
  }

  async archiveRoutine(routineId: string): Promise<Result<void>> {
    const { error } = await this.client
      .from('routines')
      .update({ is_active: false })
      .eq('id', routineId);

    if (error) return { ok: false, error: { code: 'archive_failed', message: error.message } };
    return { ok: true, data: undefined };
  }

  async completeRoutine(params: CompleteRoutineParams): Promise<Result<RoutineCompletion>> {
    const date = params.completed_date ?? today();

    const { data, error } = await this.client
      .from('routine_completions')
      .upsert(
        {
          routine_id: params.routine_id,
          child_id: params.child_id,
          completed_date: date,
          steps_completed: params.steps_completed ?? [],
          note: params.note,
          emotion_after: params.emotion_after,
        },
        { onConflict: 'routine_id,child_id,completed_date', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'completion_failed', message: error?.message ?? 'Failed' } };
    }
    return { ok: true, data };
  }

  async getCompletions(childId: string, from: string, to: string): Promise<Result<RoutineCompletion[]>> {
    const { data, error } = await this.client
      .from('routine_completions')
      .select('*')
      .eq('child_id', childId)
      .gte('completed_date', from)
      .lte('completed_date', to)
      .order('completed_date', { ascending: false });

    if (error) return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    return { ok: true, data: data ?? [] };
  }

  async isCompleteToday(routineId: string, childId: string): Promise<Result<boolean>> {
    const { data, error } = await this.client
      .from('routine_completions')
      .select('id')
      .eq('routine_id', routineId)
      .eq('child_id', childId)
      .eq('completed_date', today())
      .maybeSingle();

    if (error) return { ok: false, error: { code: 'check_failed', message: error.message } };
    return { ok: true, data: data !== null };
  }
}
