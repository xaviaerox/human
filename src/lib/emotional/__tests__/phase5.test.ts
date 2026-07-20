import { describe, it, expect, beforeEach } from 'vitest';
import { StaticEmotionalAdapter } from '../adapters/StaticEmotionalAdapter';

describe('StaticEmotionalAdapter (Phase 5)', () => {
  let adapter: StaticEmotionalAdapter;

  beforeEach(() => {
    adapter = new StaticEmotionalAdapter();
  });

  describe('submitCheckin', () => {
    it('records checkin and returns saved entry', async () => {
      const res = await adapter.submitCheckin({
        child_id: 'static-child-1',
        emotion: {
          energy_level: 4,
          valence: 4,
          emotion_word: 'Happy',
        },
        note: 'Had a great day at school',
        prompted_by: 'app',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.emotion_word).toBe('Happy');
        expect(res.data.energy_level).toBe(4);
      }
    });
  });

  describe('getRecentCheckins', () => {
    it('returns recent emotional history', async () => {
      await adapter.submitCheckin({
        child_id: 'static-child-1',
        emotion: {
          energy_level: 5,
          valence: 5,
          emotion_word: 'Calm',
        },
        prompted_by: 'app',
      });

      const res = await adapter.getRecentCheckins('static-child-1', 5);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.length).toBeGreaterThan(0);
      }
    });
  });
});
