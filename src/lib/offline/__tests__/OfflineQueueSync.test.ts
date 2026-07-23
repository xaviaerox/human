import { describe, it, expect } from 'vitest';
import { syncOfflineQueueEntry } from '../OfflineQueueSync';
import type { OfflineQueueEntry } from '@/types';

describe('OfflineQueueSync', () => {
  it('should process a queued routine_complete entry successfully in static mode', async () => {
    const entry: OfflineQueueEntry = {
      id: 'test_1',
      type: 'routine_complete',
      payload: {
        type: 'routine_complete',
        routine_id: 'routine-morning-1',
        child_id: 'static-child-1',
        completed_date: '2026-07-23',
        steps_completed: [1, 2, 3, 4],
      },
      created_at: Date.now(),
      attempts: 0,
    };

    const success = await syncOfflineQueueEntry(entry);
    expect(success).toBe(true);
  });
});
