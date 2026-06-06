// ============================================================
// MIRA — MicrotaskEngine
// AI-assisted goal decomposition + progress calculations
// ============================================================

import type { Goal, GoalMicrotask, GoalWithMicrotasks, EffortLevel } from '@/types';

// ─────────────────────────────────────────
// Progress calculation
// ─────────────────────────────────────────
export function computeGoalProgress(microtasks: GoalMicrotask[]): number {
  if (microtasks.length === 0) return 0;
  const completed = microtasks.filter(t => t.status === 'complete').length;
  return Math.round((completed / microtasks.length) * 100);
}

export function computeTotalSparks(microtasks: GoalMicrotask[]): number {
  return microtasks.reduce((sum, t) => sum + t.spark_value, 0);
}

export function getNextMicrotask(microtasks: GoalMicrotask[]): GoalMicrotask | null {
  return (
    microtasks.find(t => t.status === 'in_progress') ??
    microtasks.find(t => t.status === 'pending') ??
    null
  );
}

// ─────────────────────────────────────────
// AI decomposition prompt builder
// Produces a structured prompt for Claude Sonnet
// ─────────────────────────────────────────
export interface DecompositionPromptParams {
  goalTitle: string;
  goalDescription?: string;
  goalWhy?: string;
  childAge?: number;      // derived from birth_year
  existingTraits?: string[];  // companion personality traits as context
}

export function buildDecompositionPrompt(params: DecompositionPromptParams): string {
  const ageContext = params.childAge
    ? `The child is approximately ${params.childAge} years old.`
    : 'Age is not specified.';

  const whyContext = params.goalWhy
    ? `They want this because: "${params.goalWhy}".`
    : '';

  return `You are a warm, calm assistant helping a child break down a personal goal into small, achievable steps.

Goal: "${params.goalTitle}"
${params.goalDescription ? `Description: ${params.goalDescription}` : ''}
${whyContext}
${ageContext}

Create 3–6 concrete microtasks to achieve this goal. Each microtask should be:
- Specific and actionable (a child can know when it's done)
- Appropriately sized (completable in one sitting)
- Positively framed (no "don't" or "stop" language)
- Non-threatening (if a step feels hard, frame it gently)

Respond ONLY with valid JSON. No markdown, no preamble.

{
  "microtasks": [
    {
      "position": 1,
      "title": "string (max 60 chars, child-friendly)",
      "description": "string (optional, 1 sentence)",
      "effort_level": "easy" | "medium" | "stretch",
      "spark_value": number (1–5),
      "value_dimensions": ["autonomy" | "empathy" | "regulation" | "curiosity" | "courage" | "connection"]
    }
  ]
}`;
}

// ─────────────────────────────────────────
// AI response parser
// ─────────────────────────────────────────
export interface ParsedMicrotask {
  position: number;
  title: string;
  description?: string;
  effort_level: EffortLevel;
  spark_value: number;
  value_dimensions: Goal['value_dimensions'];
}

export interface DecompositionResult {
  microtasks: ParsedMicrotask[];
  ai_generated: true;
  ai_model_version: string;
}

export function parseDecompositionResponse(
  raw: string,
  modelVersion: string
): DecompositionResult | null {
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { microtasks: unknown[] };

    if (!Array.isArray(parsed.microtasks)) return null;

    const microtasks: ParsedMicrotask[] = parsed.microtasks
      .filter(isValidMicrotask)
      .map((t, idx) => ({
        position: typeof t.position === 'number' ? t.position : idx + 1,
        title: String(t.title).slice(0, 60),
        description: t.description ? String(t.description) : undefined,
        effort_level: validateEffortLevel(t.effort_level),
        spark_value: clampSparkValue(typeof t.spark_value === 'number' ? t.spark_value : 1),
        value_dimensions: validateDimensions(t.value_dimensions),
      }));

    return { microtasks, ai_generated: true, ai_model_version: modelVersion };
  } catch {
    return null;
  }
}

function isValidMicrotask(t: unknown): t is Record<string, unknown> {
  return typeof t === 'object' && t !== null && 'title' in t;
}

function validateEffortLevel(level: unknown): EffortLevel {
  if (level === 'easy' || level === 'medium' || level === 'stretch') return level;
  return 'medium';
}

function clampSparkValue(v: number): number {
  return Math.max(1, Math.min(10, Math.round(v)));
}

const VALID_DIMENSIONS = new Set([
  'autonomy', 'empathy', 'regulation', 'curiosity', 'courage', 'connection',
]);

function validateDimensions(dims: unknown): Goal['value_dimensions'] {
  if (!Array.isArray(dims)) return [];
  return dims.filter((d): d is string => typeof d === 'string' && VALID_DIMENSIONS.has(d)) as Goal['value_dimensions'];
}

// ─────────────────────────────────────────
// Fallback decomposition (no AI)
// Used when AI is unavailable or call fails
// ─────────────────────────────────────────
export function fallbackDecomposition(goalTitle: string): ParsedMicrotask[] {
  return [
    {
      position: 1,
      title: `Think about what I need for "${goalTitle}"`,
      effort_level: 'easy',
      spark_value: 1,
      value_dimensions: ['curiosity'],
    },
    {
      position: 2,
      title: 'Take the first small step',
      effort_level: 'easy',
      spark_value: 2,
      value_dimensions: ['courage'],
    },
    {
      position: 3,
      title: 'Keep going — I\'m getting there',
      effort_level: 'medium',
      spark_value: 3,
      value_dimensions: ['autonomy'],
    },
  ];
}

// ─────────────────────────────────────────
// Goal enrichment: add progress to goal object
// ─────────────────────────────────────────
export function enrichGoal(goal: Goal, microtasks: GoalMicrotask[]): GoalWithMicrotasks {
  return {
    ...goal,
    microtasks,
    progress: computeGoalProgress(microtasks),
  };
}
