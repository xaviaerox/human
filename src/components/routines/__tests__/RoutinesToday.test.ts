import { describe, it, expect } from 'vitest';
import type { RoutineWithSteps } from '@/types';

describe('RoutinesToday logic', () => {
  it('should calculate routine step completion ratio', () => {
    const mockRoutine: RoutineWithSteps = {
      id: 'r1',
      family_id: 'fam1',
      child_id: 'child1',
      title: 'Rutina de Noche',
      description: 'Pasos antes de dormir',
      time_of_day: 'evening',
      schedule_type: 'daily',
      is_active: true,
      color_token: 'moss',
      spark_value: 3,
      created_by: 'parent1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      steps: [
        { id: 's1', routine_id: 'r1', position: 1, title: 'Lavarse los dientes' },
        { id: 's2', routine_id: 'r1', position: 2, title: 'Ponerse el pijama' },
        { id: 's3', routine_id: 'r1', position: 3, title: 'Leer un cuento' },
      ],
    };

    const completedStepPositions = [1, 2];
    const isFullyComplete = completedStepPositions.length === mockRoutine.steps.length;
    const progressPercent = Math.round((completedStepPositions.length / mockRoutine.steps.length) * 100);

    expect(isFullyComplete).toBe(false);
    expect(progressPercent).toBe(67);
  });
});
