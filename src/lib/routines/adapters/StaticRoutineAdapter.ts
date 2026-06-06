// ============================================================
// MIRA — StaticRoutineAdapter
// ============================================================

import type { IRoutineAdapter, CreateRoutineParams, CompleteRoutineParams } from './IRoutineAdapter';
import type { Routine, RoutineStep, RoutineCompletion, RoutineWithSteps, Result } from '../../../types';

const today = () => new Date().toISOString().split('T')[0]!;

const STATIC_ROUTINES: RoutineWithSteps[] = [
  {
    id: 'routine-morning-1',
    family_id: 'static-family-1',
    child_id: 'static-child-1',
    title: 'Morning Start',
    description: 'Begin the day calmly',
    schedule_type: 'daily',
    time_of_day: 'morning',
    is_active: true,
    color_token: 'morning',
    icon_key: 'sun',
    value_dimensions: ['autonomy', 'regulation'],
    spark_value: 3,
    created_by: 'static-parent-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [
      { id: 's1', routine_id: 'routine-morning-1', position: 1, title: 'Wake up & stretch', duration_minutes: 5 },
      { id: 's2', routine_id: 'routine-morning-1', position: 2, title: 'Wash face & brush teeth', duration_minutes: 10 },
      { id: 's3', routine_id: 'routine-morning-1', position: 3, title: 'Get dressed', duration_minutes: 10 },
      { id: 's4', routine_id: 'routine-morning-1', position: 4, title: 'Eat breakfast', duration_minutes: 15 },
    ],
  },
  {
    id: 'routine-evening-1',
    family_id: 'static-family-1',
    child_id: 'static-child-1',
    title: 'Wind Down',
    description: 'Calm before sleep',
    schedule_type: 'daily',
    time_of_day: 'evening',
    is_active: true,
    color_token: 'evening',
    icon_key: 'moon',
    value_dimensions: ['regulation', 'connection'],
    spark_value: 2,
    created_by: 'static-parent-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [
      { id: 's5', routine_id: 'routine-evening-1', position: 1, title: 'Put toys away', duration_minutes: 10 },
      { id: 's6', routine_id: 'routine-evening-1', position: 2, title: 'Bath or shower', duration_minutes: 15 },
      { id: 's7', routine_id: 'routine-evening-1', position: 3, title: 'Pyjamas on', duration_minutes: 5 },
      { id: 's8', routine_id: 'routine-evening-1', position: 4, title: 'Story time with family', duration_minutes: 20 },
    ],
  },
];

export class StaticRoutineAdapter implements IRoutineAdapter {
  private _routines: RoutineWithSteps[] = [...STATIC_ROUTINES];
  private _completions: RoutineCompletion[] = [];
  private _idCounter = 100;

  private _nextId(): string {
    return `static-${++this._idCounter}`;
  }

  async getRoutines(familyId: string, childId?: string): Promise<Result<RoutineWithSteps[]>> {
    let results = this._routines.filter(r => r.family_id === familyId && r.is_active);
    if (childId) results = results.filter(r => !r.child_id || r.child_id === childId);
    return { ok: true, data: results };
  }

  async getRoutine(routineId: string): Promise<Result<RoutineWithSteps>> {
    const routine = this._routines.find(r => r.id === routineId);
    if (!routine) {
      return { ok: false, error: { code: 'not_found', message: `Routine ${routineId} not found` } };
    }
    return { ok: true, data: routine };
  }

  async createRoutine(params: CreateRoutineParams): Promise<Result<RoutineWithSteps>> {
    const id = this._nextId();
    const steps: RoutineStep[] = (params.steps ?? []).map((s, i) => ({
      ...s,
      id: this._nextId(),
      routine_id: id,
      position: s.position ?? i + 1,
    }));

    const routine: RoutineWithSteps = {
      id,
      family_id: params.family_id,
      child_id: params.child_id,
      title: params.title,
      description: params.description,
      schedule_type: params.schedule_type,
      schedule_days: params.schedule_days,
      time_of_day: params.time_of_day,
      scheduled_time: params.scheduled_time,
      is_active: true,
      color_token: params.color_token ?? 'calm',
      icon_key: params.icon_key,
      value_dimensions: params.value_dimensions,
      spark_value: params.spark_value ?? 1,
      created_by: params.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      steps,
    };

    this._routines.push(routine);
    return { ok: true, data: routine };
  }

  async updateRoutine(
    routineId: string,
    updates: Partial<Omit<Routine, 'id' | 'family_id' | 'created_at'>>
  ): Promise<Result<Routine>> {
    const idx = this._routines.findIndex(r => r.id === routineId);
    if (idx === -1) {
      return { ok: false, error: { code: 'not_found', message: 'Routine not found' } };
    }
    const updated = { ...this._routines[idx]!, ...updates, updated_at: new Date().toISOString() };
    this._routines[idx] = updated;
    return { ok: true, data: updated };
  }

  async archiveRoutine(routineId: string): Promise<Result<void>> {
    const idx = this._routines.findIndex(r => r.id === routineId);
    if (idx !== -1) {
      this._routines[idx] = { ...this._routines[idx]!, is_active: false };
    }
    return { ok: true, data: undefined };
  }

  async completeRoutine(params: CompleteRoutineParams): Promise<Result<RoutineCompletion>> {
    const date = params.completed_date ?? today();

    // Idempotency: return existing if already complete
    const existing = this._completions.find(
      c => c.routine_id === params.routine_id &&
           c.child_id === params.child_id &&
           c.completed_date === date
    );
    if (existing) return { ok: true, data: existing };

    const completion: RoutineCompletion = {
      id: this._nextId(),
      routine_id: params.routine_id,
      child_id: params.child_id,
      completed_date: date,
      steps_completed: params.steps_completed ?? [],
      note: params.note,
      emotion_after: params.emotion_after,
      completed_at: new Date().toISOString(),
    };

    this._completions.push(completion);
    return { ok: true, data: completion };
  }

  async getCompletions(childId: string, from: string, to: string): Promise<Result<RoutineCompletion[]>> {
    const results = this._completions.filter(
      c => c.child_id === childId &&
           c.completed_date >= from &&
           c.completed_date <= to
    );
    return { ok: true, data: results };
  }

  async isCompleteToday(routineId: string, childId: string): Promise<Result<boolean>> {
    const exists = this._completions.some(
      c => c.routine_id === routineId &&
           c.child_id === childId &&
           c.completed_date === today()
    );
    return { ok: true, data: exists };
  }

  async uncompleteRoutine(routineId: string, childId: string, completedDate?: string): Promise<Result<void>> {
    const date = completedDate ?? today();
    this._completions = this._completions.filter(
      c => !(c.routine_id === routineId && c.child_id === childId && c.completed_date === date)
    );
    return { ok: true, data: undefined };
  }
}
