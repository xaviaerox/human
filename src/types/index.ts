// ============================================================
// MIRA — Core Types
// Single source of truth for all domain types
// ============================================================

// ─────────────────────────────────────────
// AUTH + FAMILY
// ─────────────────────────────────────────

export type UserRole = 'parent' | 'child';

export interface Family {
  id: string;
  name: string;
  settings: FamilySettings;
  created_at: string;
  updated_at: string;
}

export interface FamilySettings {
  timezone?: string;
  locale?: string;
  theme?: 'calm' | 'warm' | 'nature';
}

export interface Profile {
  id: string;
  family_id: string;
  role: UserRole;
  display_name: string;
  avatar_seed?: string;
  birth_year?: number;
  onboarding_complete: boolean;
  unlocked_accessories?: string[];
  avatar_accessory?: string | null;
  avatar_base_emoji?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  invited_by: string;
  invite_code: string;
  role: UserRole;
  used_by?: string;
  used_at?: string;
  expires_at: string;
  created_at: string;
}

export interface FamilyWithMembers extends Family {
  members: Profile[];
}

// ─────────────────────────────────────────
// COMPANION
// ─────────────────────────────────────────

export type CompanionStage = 'egg' | 'sprout' | 'bloom' | 'glow' | 'radiant';

export const COMPANION_STAGE_THRESHOLDS: Record<CompanionStage, number> = {
  egg:     0,
  sprout:  25,
  bloom:   75,
  glow:    175,
  radiant: 350,
};

export interface Companion {
  id: string;
  child_id: string;
  name: string;
  stage: CompanionStage;
  stage_unlocked_at: Partial<Record<CompanionStage, string>>;
  bonding_score: number;
  emotional_responsiveness: number; // 10–100, never zero
  personality_traits: string[];
  equipped_accessory?: string | null;
  equipped_color_theme?: string | null;
  created_at: string;
  updated_at: string;
}

export type CompanionInteractionType =
  | 'routine_complete'
  | 'emotional_checkin'
  | 'goal_step_complete'
  | 'free_interaction'
  | 'spark_received';

export interface CompanionInteraction {
  id: string;
  companion_id: string;
  child_id: string;
  type: CompanionInteractionType;
  bonding_delta: number;
  context: Record<string, unknown>;
  occurred_at: string;
}

export type DialogueTrigger =
  | 'greeting'
  | 'routine_complete'
  | 'goal_step_complete'
  | 'checkin_prompt'
  | 'checkin_response'
  | 'idle_presence'
  | 'difficult_emotion'
  | 'celebration'
  | 'name_chosen';

export interface DialogueContext {
  stage: CompanionStage;
  childEmotion?: EmotionState;
  triggerType: DialogueTrigger;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  companionName: string;
  recentActivity?: string;
}

export interface DialogueLine {
  text: string;
  animationCue?: string;
  durationMs?: number;
}

// ─────────────────────────────────────────
// PROGRESSION — VALUE DIMENSIONS
// ─────────────────────────────────────────

export type ValueDimensionId =
  | 'autonomy'
  | 'empathy'
  | 'regulation'
  | 'curiosity'
  | 'courage'
  | 'connection';

export interface ValueDimension {
  id: ValueDimensionId;
  label: string;
  description: string;
  icon_key: string;
  color_token: string;
}

export interface ChildValueScore {
  child_id: string;
  dimension_id: ValueDimensionId;
  score: number;
  updated_at: string;
}

export type ValueScoreSourceType =
  | 'routine_complete'
  | 'goal_complete'
  | 'emotional_checkin'
  | 'parent_recognition'
  | 'free_exploration';

export interface ValueScoreEvent {
  id: string;
  child_id: string;
  dimension_id: ValueDimensionId;
  delta: number;
  source_type: ValueScoreSourceType;
  source_id?: string;
  note?: string;
  occurred_at: string;
}

export type ChildProgressionSummary = {
  child_id: string;
  scores: Record<ValueDimensionId, number>;
  total_score: number;
  strongest_dimension?: ValueDimensionId;
};

// ─────────────────────────────────────────
// ROUTINES
// ─────────────────────────────────────────

export type ScheduleType = 'daily' | 'weekdays' | 'weekends' | 'custom' | 'one_off';
export type TimeOfDay = 'morning' | 'midday' | 'evening' | 'anytime';

export interface Routine {
  id: string;
  family_id: string;
  child_id?: string;
  title: string;
  description?: string;
  schedule_type: ScheduleType;
  schedule_days?: number[];
  time_of_day?: TimeOfDay;
  scheduled_time?: string;
  is_active: boolean;
  color_token: string;
  icon_key?: string;
  value_dimensions?: ValueDimensionId[];
  spark_value: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RoutineStep {
  id: string;
  routine_id: string;
  position: number;
  title: string;
  description?: string;
  duration_minutes?: number;
  visual_support?: string;
}

export interface RoutineCompletion {
  id: string;
  routine_id: string;
  child_id: string;
  completed_date: string;
  steps_completed: number[];
  note?: string;
  emotion_after?: string;
  completed_at: string;
}

export interface RoutineWithSteps extends Routine {
  steps: RoutineStep[];
  completions?: RoutineCompletion[];
}

// ─────────────────────────────────────────
// GOALS + MICROTASKS
// ─────────────────────────────────────────

export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';
export type EffortLevel = 'easy' | 'medium' | 'stretch';
export type MicrotaskStatus = 'pending' | 'in_progress' | 'complete';

export interface Goal {
  id: string;
  family_id: string;
  child_id: string;
  title: string;
  description?: string;
  why?: string;
  status: GoalStatus;
  target_date?: string;
  value_dimensions?: ValueDimensionId[];
  total_sparks: number;
  visibility: 'child_and_parent' | 'parent_only';
  co_created: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GoalMicrotask {
  id: string;
  goal_id: string;
  position: number;
  title: string;
  description?: string;
  effort_level?: EffortLevel;
  spark_value: number;
  value_dimensions?: ValueDimensionId[];
  status: MicrotaskStatus;
  ai_generated: boolean;
  ai_model_version?: string;
  completed_at?: string;
  completed_by?: string;
}

export interface GoalWithMicrotasks extends Goal {
  microtasks: GoalMicrotask[];
  progress: number; // 0–100
}

// ─────────────────────────────────────────
// EMOTIONAL TRACKING
// ─────────────────────────────────────────

export type ContextType =
  | 'morning'
  | 'after_routine'
  | 'after_goal'
  | 'free'
  | 'bedtime';

export type CheckinPromptSource = 'app' | 'child';

export interface EmotionState {
  energy_level: 1 | 2 | 3 | 4 | 5;
  valence: 1 | 2 | 3 | 4 | 5;
  emotion_word?: string;
}

export interface EmotionalCheckin {
  id: string;
  child_id: string;
  emotion_word?: string;
  energy_level: number;
  valence: number;
  context_type?: ContextType;
  context_id?: string;
  note?: string;
  prompted_by: CheckinPromptSource;
  companion_response_key?: string;
  occurred_at: string;
}

export interface EmotionalWeeklySummary {
  child_id: string;
  week_start: string;
  avg_energy: number;
  avg_valence: number;
  checkin_count: number;
  most_common_emotion?: string;
}

// ─────────────────────────────────────────
// SPARKS
// ─────────────────────────────────────────

export type SparkSourceType =
  | 'routine_complete'
  | 'goal_microtask'
  | 'goal_complete'
  | 'emotional_checkin'
  | 'parent_bonus'
  | 'redemption';

export interface SparkLedgerEntry {
  id: string;
  child_id: string;
  family_id: string;
  delta: number;
  balance_after: number;
  source_type: SparkSourceType;
  source_id?: string;
  note?: string;
  awarded_by?: string;
  created_at: string;
}

export interface SparkBalance {
  child_id: string;
  balance: number;
}

// ─────────────────────────────────────────
// SHARED UTILITY TYPES
// ─────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
}

export interface MiraError {
  code: string;
  message: string;
  details?: unknown;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: MiraError };

export interface OfflineQueueEntry {
  id: string;
  type: string;
  payload: unknown;
  created_at: number;
  attempts: number;
}

// Re-exported from MicrotaskEngine for convenience
export type { ParsedMicrotask, DecompositionResult } from '@/lib/goals/MicrotaskEngine';
// Re-exported from CompanionEngine
export type { CompanionDisplayState, AppearanceContext, ResponsivenessLevel } from '@/lib/companion/CompanionEngine';

// ─────────────────────────────────────────
// REWARDS
// ─────────────────────────────────────────

export interface Reward {
  id: string;
  family_id: string;
  title: string;
  cost: number;
  emoji: string;
  cooldown_hours: number;
  created_at?: string;
  updated_at?: string;
}

export interface RewardRequest {
  id: string;
  family_id: string;
  child_id: string;
  title: string;
  emoji: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  child?: {
    display_name: string;
  };
}

