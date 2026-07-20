import { describe, it, expect, beforeEach } from 'vitest';
import { StaticGoalsAdapter } from '../adapters/StaticGoalsAdapter';

describe('StaticGoalsAdapter (Phase 4)', () => {
  let adapter: StaticGoalsAdapter;

  beforeEach(() => {
    adapter = new StaticGoalsAdapter();
  });

  describe('getGoals', () => {
    it('returns goals for active child', async () => {
      const res = await adapter.getGoals('static-child-1');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.length).toBeGreaterThan(0);
      }
    });
  });

  describe('createGoal & completeMicrotask', () => {
    it('creates a goal and completes microtasks', async () => {
      const createRes = await adapter.createGoal({
        family_id: 'static-family-1',
        child_id: 'static-child-1',
        title: 'Bake a cake',
        description: 'Chocolate cake',
        value_dimensions: ['autonomy', 'curiosity'],
        created_by: 'static-parent-1',
        microtasks: [
          { position: 1, title: 'Buy ingredients', effort_level: 'easy', spark_value: 1, value_dimensions: ['autonomy'] },
          { position: 2, title: 'Mix flour', effort_level: 'medium', spark_value: 2, value_dimensions: ['curiosity'] },
        ],
      });

      expect(createRes.ok).toBe(true);
      if (!createRes.ok) return;

      const goal = createRes.data;
      const microtaskId = goal.microtasks[0].id;

      const completeRes = await adapter.completeMicrotask(microtaskId, 'static-child-1');
      expect(completeRes.ok).toBe(true);
      if (completeRes.ok) {
        expect(completeRes.data.status).toBe('complete');
      }
    });
  });
});
