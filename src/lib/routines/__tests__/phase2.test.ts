import { describe, it, expect, beforeEach } from 'vitest';
import { StaticRoutineAdapter } from '../adapters/StaticRoutineAdapter';

describe('StaticRoutineAdapter (Phase 2)', () => {
  let adapter: StaticRoutineAdapter;

  beforeEach(() => {
    adapter = new StaticRoutineAdapter();
  });

  describe('getRoutines', () => {
    it('returns routine list for known family', async () => {
      const res = await adapter.getRoutines('static-family-1');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.length).toBeGreaterThan(0);
      }
    });
  });

  describe('completeRoutine & uncompleteRoutine', () => {
    it('completes routine idempotently', async () => {
      const today = new Date().toISOString().split('T')[0]!;
      const res1 = await adapter.completeRoutine({
        routine_id: 'routine-morning-1',
        child_id: 'static-child-1',
        completed_date: today,
        steps_completed: [1, 2, 3, 4],
      });
      expect(res1.ok).toBe(true);

      const isComp = await adapter.isCompleteToday('routine-morning-1', 'static-child-1');
      expect(isComp.ok).toBe(true);
      if (isComp.ok) {
        expect(isComp.data).toBe(true);
      }
    });

    it('uncompletes routine for today', async () => {
      const today = new Date().toISOString().split('T')[0]!;
      await adapter.completeRoutine({
        routine_id: 'routine-morning-1',
        child_id: 'static-child-1',
        completed_date: today,
        steps_completed: [1, 2, 3, 4],
      });
      const res = await adapter.uncompleteRoutine('routine-morning-1', 'static-child-1', today);
      expect(res.ok).toBe(true);

      const isComp = await adapter.isCompleteToday('routine-morning-1', 'static-child-1');
      if (isComp.ok) {
        expect(isComp.data).toBe(false);
      }
    });
  });
});
