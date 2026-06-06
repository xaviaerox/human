// ============================================================
// MIRA — CompanionEngine
// Pure logic: stage thresholds, bonding deltas, trait unlocks
// No side effects; fully testable
// ============================================================

import type {
  Companion,
  CompanionStage,
  CompanionInteractionType,
  DialogueContext,
  DialogueLine,
} from '@/types';

// ─────────────────────────────────────────
// Stage thresholds
// ─────────────────────────────────────────
export const STAGE_THRESHOLDS: Record<CompanionStage, number> = {
  egg:     0,
  sprout:  25,
  bloom:   75,
  glow:    175,
  radiant: 350,
};

export const STAGE_ORDER: CompanionStage[] = ['egg', 'sprout', 'bloom', 'glow', 'radiant'];

// ─────────────────────────────────────────
// Bonding deltas per interaction type
// ─────────────────────────────────────────
export const BONDING_DELTAS: Record<CompanionInteractionType, number> = {
  routine_complete:    2,
  emotional_checkin:  3,
  goal_step_complete: 2,
  free_interaction:   1,
  spark_received:     1,
};

// ─────────────────────────────────────────
// Stage derivation (pure — mirrors DB trigger)
// ─────────────────────────────────────────
export function stageFromScore(bondingScore: number): CompanionStage {
  if (bondingScore >= STAGE_THRESHOLDS.radiant) return 'radiant';
  if (bondingScore >= STAGE_THRESHOLDS.glow)    return 'glow';
  if (bondingScore >= STAGE_THRESHOLDS.bloom)   return 'bloom';
  if (bondingScore >= STAGE_THRESHOLDS.sprout)  return 'sprout';
  return 'egg';
}

// Stage never regresses — enforced client-side to mirror DB trigger
export function advanceStage(companion: Companion, newBondingScore: number): CompanionStage {
  const derivedStage = stageFromScore(newBondingScore);
  const currentIdx = STAGE_ORDER.indexOf(companion.stage);
  const derivedIdx = STAGE_ORDER.indexOf(derivedStage);
  return derivedIdx > currentIdx ? derivedStage : companion.stage;
}

// ─────────────────────────────────────────
// Progress to next stage (0–1)
// ─────────────────────────────────────────
export function stageProgress(companion: Companion): number {
  const current = companion.stage;
  const currentIdx = STAGE_ORDER.indexOf(current);
  const nextStage = STAGE_ORDER[currentIdx + 1];

  if (!nextStage) return 1; // radiant — fully complete

  const currentThreshold = STAGE_THRESHOLDS[current];
  const nextThreshold = STAGE_THRESHOLDS[nextStage];
  const range = nextThreshold - currentThreshold;
  const progress = companion.bonding_score - currentThreshold;

  return Math.min(1, Math.max(0, progress / range));
}

// ─────────────────────────────────────────
// Personality trait unlock rules
// Traits emerge naturally from interaction patterns
// ─────────────────────────────────────────
export interface TraitUnlockRule {
  trait: string;
  requiredStage: CompanionStage;
  condition: (companion: Companion, interactionCounts: Record<CompanionInteractionType, number>) => boolean;
  description: string; // internal documentation only
}

export const TRAIT_UNLOCK_RULES: TraitUnlockRule[] = [
  {
    trait: 'curious',
    requiredStage: 'sprout',
    condition: (c, counts) => counts.routine_complete >= 5,
    description: 'Unlocked after 5 routine completions',
  },
  {
    trait: 'gentle',
    requiredStage: 'sprout',
    condition: (c, counts) => counts.emotional_checkin >= 3,
    description: 'Unlocked after 3 emotional check-ins',
  },
  {
    trait: 'playful',
    requiredStage: 'bloom',
    condition: (c, counts) => counts.free_interaction >= 5,
    description: 'Unlocked after 5 free interactions',
  },
  {
    trait: 'brave',
    requiredStage: 'bloom',
    condition: (c, counts) => counts.goal_step_complete >= 5,
    description: 'Unlocked after 5 goal step completions',
  },
  {
    trait: 'warm',
    requiredStage: 'glow',
    condition: (c, counts) =>
      counts.emotional_checkin >= 15 && counts.routine_complete >= 20,
    description: 'Unlocked after sustained engagement',
  },
];

export function computeNewTraits(
  companion: Companion,
  interactionCounts: Record<CompanionInteractionType, number>
): string[] {
  const current = new Set(companion.personality_traits);
  const newTraits: string[] = [];

  for (const rule of TRAIT_UNLOCK_RULES) {
    if (
      !current.has(rule.trait) &&
      STAGE_ORDER.indexOf(companion.stage) >= STAGE_ORDER.indexOf(rule.requiredStage) &&
      rule.condition(companion, interactionCounts)
    ) {
      newTraits.push(rule.trait);
    }
  }

  return newTraits;
}

// ─────────────────────────────────────────
// Emotional responsiveness effects on dialogue
// ─────────────────────────────────────────
export type ResponsivenessLevel = 'low' | 'medium' | 'high';

export function responsivenessLevel(score: number): ResponsivenessLevel {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// ─────────────────────────────────────────
// Time-of-day resolution
// ─────────────────────────────────────────
export function resolveTimeOfDay(date = new Date()): DialogueContext['timeOfDay'] {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// ─────────────────────────────────────────
// Companion appearance rules
// Determines if companion should appear in a given context
// ─────────────────────────────────────────
export type AppearanceContext =
  | 'home'
  | 'routine_active'
  | 'routine_complete'
  | 'goal_step_complete'
  | 'checkin'
  | 'checkin_response'
  | 'transition'
  | 'parent_dashboard';

export function shouldCompanionAppear(context: AppearanceContext): boolean {
  // Parent dashboard: never. Active task: never (no distraction).
  const HIDDEN_CONTEXTS: AppearanceContext[] = ['parent_dashboard', 'routine_active'];
  return !HIDDEN_CONTEXTS.includes(context);
}

// ─────────────────────────────────────────
// Summary for display (never raw numbers to child)
// ─────────────────────────────────────────
export interface CompanionDisplayState {
  name: string;
  stage: CompanionStage;
  stageProgress: number; // 0–1
  isNewStage: boolean;
  responsivenessLevel: ResponsivenessLevel;
  traits: string[];
  // Deliberately no bonding_score number — not shown to child
}

export function toDisplayState(
  companion: Companion,
  previousStage?: CompanionStage
): CompanionDisplayState {
  return {
    name: companion.name,
    stage: companion.stage,
    stageProgress: stageProgress(companion),
    isNewStage: previousStage !== undefined && previousStage !== companion.stage,
    responsivenessLevel: responsivenessLevel(companion.emotional_responsiveness),
    traits: companion.personality_traits,
  };
}
