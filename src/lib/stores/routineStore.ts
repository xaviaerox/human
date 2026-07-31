import type { Routine } from '@/types';
import { getRoutineAdapter } from '@/lib/adapters';

export interface RoutineState {
  routines: Routine[];
  allRoutinesDone: boolean;
  loading: boolean;
}

export async function fetchRoutinesState(familyId: string, profileId: string): Promise<RoutineState> {
  const adapter = getRoutineAdapter();
  const routinesRes = await adapter.getRoutines(familyId, profileId);
  if (!routinesRes.ok) {
    return { routines: [], allRoutinesDone: false, loading: false };
  }

  const routines = routinesRes.data;
  const today = new Date().toISOString().split('T')[0]!;
  const completionsRes = await adapter.getCompletions(profileId, today, today);

  if (!completionsRes.ok) {
    return { routines, allRoutinesDone: false, loading: false };
  }

  const completedIds = new Set(completionsRes.data.map(c => c.routine_id));
  const pending = routines.filter(r => !completedIds.has(r.id));

  return {
    routines,
    allRoutinesDone: pending.length === 0,
    loading: false,
  };
}
