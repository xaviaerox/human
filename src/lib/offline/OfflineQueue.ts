// ============================================================
// MIRA — OfflineQueue
// localStorage-based queue; drains on reconnect
// Preserves routine completions, microtask completions,
// and emotional check-ins during offline periods
// ============================================================

import type { OfflineQueueEntry } from '@/types';

export type QueuedActionType =
  | 'routine_complete'
  | 'microtask_complete'
  | 'emotional_checkin';

export interface QueuedRoutineComplete {
  type: 'routine_complete';
  routine_id: string;
  child_id: string;
  completed_date: string;
  steps_completed: number[];
  note?: string;
  emotion_after?: string;
}

export interface QueuedMicrotaskComplete {
  type: 'microtask_complete';
  microtask_id: string;
  completed_by: string;
}

export interface QueuedEmotionalCheckin {
  type: 'emotional_checkin';
  child_id: string;
  energy_level: number;
  valence: number;
  emotion_word?: string;
  context_type?: string;
  note?: string;
  prompted_by: string;
}

export type QueuedAction =
  | QueuedRoutineComplete
  | QueuedMicrotaskComplete
  | QueuedEmotionalCheckin;

const STORAGE_KEY = 'mira:offline_queue';
const MAX_ATTEMPTS = 3;

export class OfflineQueue {
  private _isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private _draining = false;
  private _onDrain?: (entry: OfflineQueueEntry) => Promise<boolean>;

  constructor(onDrain?: (entry: OfflineQueueEntry) => Promise<boolean>) {
    this._onDrain = onDrain;

    if (typeof window !== 'undefined') {
      window.addEventListener('online',  () => this._onOnline());
      window.addEventListener('offline', () => { this._isOnline = false; });
    }
  }

  // ─────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────
  get isOnline(): boolean { return this._isOnline; }

  enqueue(action: QueuedAction): OfflineQueueEntry {
    const entry: OfflineQueueEntry = {
      id: this._generateId(),
      type: action.type,
      payload: action,
      created_at: Date.now(),
      attempts: 0,
    };

    const queue = this._load();
    queue.push(entry);
    this._save(queue);
    return entry;
  }

  getQueue(): OfflineQueueEntry[] {
    return this._load();
  }

  size(): number {
    return this._load().length;
  }

  clear(): void {
    this._save([]);
  }

  remove(id: string): void {
    const queue = this._load().filter(e => e.id !== id);
    this._save(queue);
  }

  async drain(): Promise<{ processed: number; failed: number }> {
    if (this._draining || !this._onDrain) return { processed: 0, failed: 0 };
    this._draining = true;

    let processed = 0;
    let failed = 0;
    const queue = this._load();

    for (const entry of queue) {
      if (entry.attempts >= MAX_ATTEMPTS) {
        failed++;
        continue;
      }

      try {
        const success = await this._onDrain(entry);
        if (success) {
          this.remove(entry.id);
          processed++;
        } else {
          this._incrementAttempts(entry.id);
          failed++;
        }
      } catch {
        this._incrementAttempts(entry.id);
        failed++;
      }
    }

    this._draining = false;
    return { processed, failed };
  }

  // ─────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────
  private _onOnline(): void {
    this._isOnline = true;
    if (this.size() > 0) {
      this.drain();
    }
  }

  private _load(): OfflineQueueEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as OfflineQueueEntry[]) : [];
    } catch {
      return [];
    }
  }

  private _save(queue: OfflineQueueEntry[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // Storage full — silently fail; the app remains functional online
    }
  }

  private _incrementAttempts(id: string): void {
    const queue = this._load().map(e =>
      e.id === id ? { ...e, attempts: e.attempts + 1 } : e
    );
    this._save(queue);
  }

  private _generateId(): string {
    return `oq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

// Singleton for app-wide use
let _instance: OfflineQueue | null = null;

export function getOfflineQueue(onDrain?: (entry: OfflineQueueEntry) => Promise<boolean>): OfflineQueue {
  if (!_instance) _instance = new OfflineQueue(onDrain);
  return _instance;
}
