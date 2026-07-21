import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineQueue } from '../OfflineQueue';

describe('OfflineQueue (Phase 6)', () => {
  let queue: OfflineQueue;
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    mockStorage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mockStorage.get(k) ?? null,
      setItem: (k: string, v: string) => { mockStorage.set(k, v); },
      removeItem: (k: string) => { mockStorage.delete(k); },
    });

    queue = new OfflineQueue();
    queue.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('enqueue', () => {
    it('enqueues a routine completion action', () => {
      const entry = queue.enqueue({
        type: 'routine_complete',
        routine_id: 'routine-1',
        child_id: 'static-child-1',
        completed_date: '2026-07-21',
        steps_completed: [1, 2],
      });

      expect(entry.id).toBeDefined();
      expect(queue.size()).toBe(1);
    });
  });

  describe('drain', () => {
    it('drains items successfully', async () => {
      let drainedCount = 0;
      const drainableQueue = new OfflineQueue(async () => {
        drainedCount++;
        return true;
      });

      drainableQueue.enqueue({
        type: 'routine_complete',
        routine_id: 'routine-1',
        child_id: 'static-child-1',
        completed_date: '2026-07-21',
        steps_completed: [1],
      });

      const res = await drainableQueue.drain();
      expect(res.processed).toBe(1);
      expect(drainedCount).toBe(1);
      expect(drainableQueue.size()).toBe(0);
    });
  });
});
