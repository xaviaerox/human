import { OfflineQueue, getOfflineQueue } from './OfflineQueue';
import { getRoutineAdapter, getGoalsAdapter, getEmotionalAdapter } from '@/lib/adapters';
import type { OfflineQueueEntry, ContextType, CheckinPromptSource } from '@/types';

/**
 * Global Sync Handler that flushes queued offline actions to backend adapters upon reconnect.
 */
export async function syncOfflineQueueEntry(entry: OfflineQueueEntry): Promise<boolean> {
  const payload = entry.payload as Record<string, unknown>;

  if (entry.type === 'routine_complete' || payload.type === 'routine_complete') {
    const routineAdapter = getRoutineAdapter();
    const res = await routineAdapter.completeRoutine({
      routine_id: payload.routine_id as string,
      child_id: payload.child_id as string,
      completed_date: (payload.completed_date as string) || new Date().toISOString().split('T')[0]!,
      steps_completed: (payload.steps_completed as number[]) || [],
      note: payload.note as string | undefined,
      emotion_after: payload.emotion_after as string | undefined,
    });
    return res.ok;
  }

  if (entry.type === 'microtask_complete' || payload.type === 'microtask_complete') {
    const goalsAdapter = getGoalsAdapter();
    const res = await goalsAdapter.completeMicrotask(payload.microtask_id as string, payload.completed_by as string);
    return res.ok;
  }

  if (entry.type === 'emotional_checkin' || payload.type === 'emotional_checkin') {
    const emotionalAdapter = getEmotionalAdapter();
    const res = await emotionalAdapter.submitCheckin({
      child_id: payload.child_id as string,
      emotion: {
        energy_level: ((payload.energy_level as number) || 3) as 1 | 2 | 3 | 4 | 5,
        valence: ((payload.valence as number) || 3) as 1 | 2 | 3 | 4 | 5,
        emotion_word: (payload.emotion_word as string) || 'tranquilo',
      },
      context_type: ((payload.context_type as string) || 'free') as ContextType,
      note: payload.note as string | undefined,
      prompted_by: ((payload.prompted_by as string) || 'child') as CheckinPromptSource,
    });
    return res.ok;
  }

  return true;
}

export function initOfflineQueueSync(): OfflineQueue {
  return getOfflineQueue(syncOfflineQueueEntry);
}
