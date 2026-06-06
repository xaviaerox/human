// ============================================================
// MIRA — IEmotionalAdapter
// ============================================================

import type {
  EmotionalCheckin,
  EmotionalWeeklySummary,
  EmotionState,
  ContextType,
  CheckinPromptSource,
  Result,
} from '@/types';
import type { CheckinPrompt } from '@/lib/emotional/EmotionModel';

export interface SubmitCheckinParams {
  child_id: string;
  emotion: EmotionState;
  context_type?: ContextType;
  context_id?: string;
  note?: string;
  prompted_by: CheckinPromptSource;
}

export interface IEmotionalAdapter {
  /** Submit a new check-in */
  submitCheckin(params: SubmitCheckinParams): Promise<Result<EmotionalCheckin>>;

  /** Get recent check-ins for a child */
  getRecentCheckins(childId: string, limit?: number): Promise<Result<EmotionalCheckin[]>>;

  /** Get last check-in (for prompt throttling) */
  getLastCheckin(childId: string): Promise<Result<EmotionalCheckin | null>>;

  /** Get weekly summaries for parent dashboard */
  getWeeklySummaries(childId: string, weeksBack?: number): Promise<Result<EmotionalWeeklySummary[]>>;

  /** Get or create check-in schedule for a child */
  getCheckinSchedule(childId: string): Promise<Result<CheckinPrompt[]>>;

  /** Update check-in schedule (parent only) */
  updateCheckinSchedule(childId: string, schedule: CheckinPrompt[]): Promise<Result<CheckinPrompt[]>>;
}
