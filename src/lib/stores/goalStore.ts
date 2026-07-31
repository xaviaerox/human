import type { GoalWithMicrotasks, GoalMicrotask } from '@/types';
import { getGoalsAdapter } from '@/lib/adapters';
import { getNextMicrotask } from '@/lib/goals/MicrotaskEngine';

export interface GoalState {
  activeGoals: GoalWithMicrotasks[];
  proposedGoals: GoalWithMicrotasks[];
  activeGoal: GoalWithMicrotasks | null;
  nextTask: GoalMicrotask | null;
}

export async function fetchGoalState(profileId: string): Promise<GoalState> {
  const adapter = getGoalsAdapter();
  const res = await adapter.getGoals(profileId);
  if (!res.ok) {
    return { activeGoals: [], proposedGoals: [], activeGoal: null, nextTask: null };
  }

  const activeList = res.data.filter(g => g.status === 'active');
  const proposedList = res.data.filter(g => g.status === 'paused' && g.co_created);

  const active = activeList[0] || null;
  let task: GoalMicrotask | null = null;

  if (active) {
    const isStuck = Date.now() - new Date(active.updated_at).getTime() > 48 * 60 * 60 * 1000;
    const next = getNextMicrotask(active.microtasks);
    if (next) {
      task = { ...next, isStuck } as GoalMicrotask;
    }
  }

  return {
    activeGoals: activeList,
    proposedGoals: proposedList,
    activeGoal: active,
    nextTask: task,
  };
}
