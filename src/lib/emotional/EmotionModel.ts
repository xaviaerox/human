// ============================================================
// MIRA — EmotionModel
// Energy × valence grid
// Non-judgmental: no emotion is labelled "bad"
// ============================================================

import type { EmotionState, ContextType } from '@/types';

// ─────────────────────────────────────────
// Emotion grid quadrants
// Used to categorise without labelling
// ─────────────────────────────────────────
export type EmotionQuadrant =
  | 'high_energy_pleasant'    // excited, happy, energised
  | 'high_energy_unpleasant'  // anxious, angry, overwhelmed
  | 'low_energy_pleasant'     // calm, content, peaceful
  | 'low_energy_unpleasant';  // sad, tired, withdrawn

export function classifyEmotion(state: EmotionState): EmotionQuadrant {
  const highEnergy = state.energy_level >= 3;
  const pleasant   = state.valence >= 3;
  if (highEnergy && pleasant)   return 'high_energy_pleasant';
  if (highEnergy && !pleasant)  return 'high_energy_unpleasant';
  if (!highEnergy && pleasant)  return 'low_energy_pleasant';
  return 'low_energy_unpleasant';
}

// ─────────────────────────────────────────
// Suggested emotion words per quadrant
// Shown as gentle options to the child
// Child may also type their own
// ─────────────────────────────────────────
export const EMOTION_WORD_SUGGESTIONS: Record<EmotionQuadrant, string[]> = {
  high_energy_pleasant: ['Feliz', 'Entusiasmado/a', 'Alegre', 'Orgulloso/a', 'Animado/a', 'Juguetón/a'],
  high_energy_unpleasant: ['Ansioso/a', 'Frustrado/a', 'Enojado/a', 'Abrumado/a', 'Inquieto/a', 'Nervioso/a'],
  low_energy_pleasant: ['Tranquilo/a', 'Relajado/a', 'En paz', 'Seguro/a', 'A gusto', 'Cómodo/a'],
  low_energy_unpleasant: ['Triste', 'Cansado/a', 'Desanimado/a', 'Solo/a', 'Confuso/a', 'Pesado/a'],
};

export function getSuggestedWords(state: Omit<EmotionState, 'emotion_word'>): string[] {
  return EMOTION_WORD_SUGGESTIONS[classifyEmotion(state)];
}

// ─────────────────────────────────────────
// Check-in prompt schedule
// ─────────────────────────────────────────
export interface CheckinPrompt {
  context: ContextType;
  enabled: boolean;
  time: string | null; // HH:MM or null (event-triggered)
}

export const DEFAULT_CHECKIN_SCHEDULE: CheckinPrompt[] = [
  { context: 'morning',       enabled: true,  time: '08:00' },
  { context: 'after_routine', enabled: true,  time: null   }, // triggered by routine completion
  { context: 'bedtime',       enabled: true,  time: '20:00' },
];

// ─────────────────────────────────────────
// Should prompt now?
// Pure function — takes current time, last check-in
// ─────────────────────────────────────────
export function shouldPromptCheckin(
  schedule: CheckinPrompt[],
  context: ContextType,
  lastCheckinAt: Date | null,
  now = new Date()
): boolean {
  const prompt = schedule.find(p => p.context === context && p.enabled);
  if (!prompt) return false;

  // Never prompt within 8 hours of last check-in
  if (lastCheckinAt) {
    const elapsed = now.getTime() - lastCheckinAt.getTime();
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;
    if (elapsed < EIGHT_HOURS) return false;
  }

  if (prompt.time) {
    const [hh, mm] = prompt.time.split(':').map(Number);
    const scheduled = new Date(now);
    scheduled.setHours(hh!, mm!, 0, 0);
    // Prompt within a 15-minute window
    const diff = Math.abs(now.getTime() - scheduled.getTime());
    return diff <= 15 * 60 * 1000;
  }

  // Event-triggered (no time) — always prompt if context matches
  return true;
}

// ─────────────────────────────────────────
// Weekly trend analysis
// For parent dashboard — never shown to child
// ─────────────────────────────────────────
export interface EmotionTrend {
  direction: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  avg_valence_change: number;
  avg_energy_change: number;
  weeks_analysed: number;
}

export interface WeeklySummaryLike {
  week_start: string;
  avg_valence: number;
  avg_energy: number;
  checkin_count: number;
}

export function analyseEmotionTrend(summaries: WeeklySummaryLike[]): EmotionTrend {
  const sorted = [...summaries].sort((a, b) =>
    new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
  );

  if (sorted.length < 2) {
    return {
      direction: 'insufficient_data',
      avg_valence_change: 0,
      avg_energy_change: 0,
      weeks_analysed: sorted.length,
    };
  }

  const recent = sorted.slice(-2);
  const valenceChange = (recent[1]?.avg_valence ?? 0) - (recent[0]?.avg_valence ?? 0);
  const energyChange  = (recent[1]?.avg_energy ?? 0) - (recent[0]?.avg_energy ?? 0);

  let direction: EmotionTrend['direction'];
  if (valenceChange > 0.3)       direction = 'improving';
  else if (valenceChange < -0.3) direction = 'declining';
  else                           direction = 'stable';

  return {
    direction,
    avg_valence_change: Math.round(valenceChange * 10) / 10,
    avg_energy_change:  Math.round(energyChange * 10) / 10,
    weeks_analysed: sorted.length,
  };
}

// ─────────────────────────────────────────
// Check-in validation
// ─────────────────────────────────────────
export interface CheckinValidationError {
  field: 'energy_level' | 'valence';
  message: string;
}

export function validateCheckin(state: Partial<EmotionState>): CheckinValidationError[] {
  const errors: CheckinValidationError[] = [];
  if (!state.energy_level || state.energy_level < 1 || state.energy_level > 5) {
    errors.push({ field: 'energy_level', message: 'Energy level must be between 1 and 5' });
  }
  if (!state.valence || state.valence < 1 || state.valence > 5) {
    errors.push({ field: 'valence', message: 'Valence must be between 1 and 5' });
  }
  return errors;
}
