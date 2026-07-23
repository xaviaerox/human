import { describe, it, expect } from 'vitest';
import { getNextMicrotask } from '@/lib/goals/MicrotaskEngine';
import type { GoalMicrotask } from '@/types';

describe('ActiveGoalStep logic', () => {
  it('should identify the next pending microtask', () => {
    const microtasks: GoalMicrotask[] = [
      { id: '1', goal_id: 'g1', title: 'Paso 1', effort_level: 'easy', spark_value: 1, status: 'complete', position: 1, ai_generated: false },
      { id: '2', goal_id: 'g1', title: 'Paso 2', effort_level: 'medium', spark_value: 2, status: 'pending', position: 2, ai_generated: false },
      { id: '3', goal_id: 'g1', title: 'Paso 3', effort_level: 'stretch', spark_value: 3, status: 'pending', position: 3, ai_generated: false },
    ];

    const next = getNextMicrotask(microtasks);
    expect(next?.id).toBe('2');
    expect(next?.title).toBe('Paso 2');
  });

  it('should return null when all microtasks are complete', () => {
    const microtasks: GoalMicrotask[] = [
      { id: '1', goal_id: 'g1', title: 'Paso 1', effort_level: 'easy', spark_value: 1, status: 'complete', position: 1, ai_generated: false },
      { id: '2', goal_id: 'g1', title: 'Paso 2', effort_level: 'medium', spark_value: 2, status: 'complete', position: 2, ai_generated: false },
    ];

    const next = getNextMicrotask(microtasks);
    expect(next).toBeNull();
  });
});
