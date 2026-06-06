// ============================================================
// MIRA — IRoutineAdapter
// ============================================================

import type {
  Routine,
  RoutineStep,
  RoutineCompletion,
  RoutineWithSteps,
  Result,
} from '../../../types';

export interface CreateRoutineParams {
  family_id: string;
  child_id?: string;
  title: string;
  description?: string;
  schedule_type: Routine['schedule_type'];
  schedule_days?: number[];
  time_of_day?: Routine['time_of_day'];
  scheduled_time?: string;
  color_token?: string;
  icon_key?: string;
  value_dimensions?: Routine['value_dimensions'];
  spark_value?: number;
  created_by: string;
  steps?: Omit<RoutineStep, 'id' | 'routine_id'>[];
}

export interface CompleteRoutineParams {
  routine_id: string;
  child_id: string;
  completed_date?: string; // defaults to today
  steps_completed?: number[];
  note?: string;
  emotion_after?: string;
}

export interface IRoutineAdapter {
  /** Get all active routines for a family/child */
  getRoutines(familyId: string, childId?: string): Promise<Result<RoutineWithSteps[]>>;

  /** Get a single routine with its steps */
  getRoutine(routineId: string): Promise<Result<RoutineWithSteps>>;

  /** Create a routine with optional steps */
  createRoutine(params: CreateRoutineParams): Promise<Result<RoutineWithSteps>>;

  /** Update a routine */
  updateRoutine(routineId: string, updates: Partial<Omit<Routine, 'id' | 'family_id' | 'created_at'>>): Promise<Result<Routine>>;

  /** Archive (soft-delete) a routine */
  archiveRoutine(routineId: string): Promise<Result<void>>;

  /** Mark a routine complete — idempotent */
  completeRoutine(params: CompleteRoutineParams): Promise<Result<RoutineCompletion>>;

  /** Get completions for a child in a date range */
  getCompletions(childId: string, from: string, to: string): Promise<Result<RoutineCompletion[]>>;

  /** Check if routine is already complete for today */
  isCompleteToday(routineId: string, childId: string): Promise<Result<boolean>>;
}
