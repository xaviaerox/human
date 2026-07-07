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
  numTasks?: number;
  sparkValue?: number;
}

export function buildDecompositionPrompt(params: DecompositionPromptParams): string {
  const ageContext = params.childAge
    ? `El niño tiene aproximadamente ${params.childAge} años.`
    : 'La edad del niño no está especificada.';

  const whyContext = params.goalWhy
    ? `Quiere lograr esto porque: "${params.goalWhy}".`
    : '';

  const count = params.numTasks || 21;
  const reward = params.sparkValue || 1;

  return `Eres un asistente cálido, paciente y experto en psicología infantil y pedagogía. Estás ayudando a un padre o a un niño a descomponer un objetivo personal en pasos pequeños, realistas y alcanzables para el niño.

Objetivo principal: "${params.goalTitle}"
${params.goalDescription ? `Descripción: ${params.goalDescription}` : ''}
${whyContext}
${ageContext}

Crea exactamente ${count} microtareas concretas y secuenciales para lograr este objetivo (organizándolo como un reto paso a paso). Cada microtarea debe cumplir con lo siguiente:
- Ser específica y actionable (el niño sabe exactamente cuándo la ha terminado).
- Tener un tamaño adecuado (se puede completar en una sola sesión de 15-30 minutos).
- Estar redactada en primera persona desde la perspectiva del niño (ej. "Preparo mi mochila", "Doy tres pedaleadas", "Respiro hondo").
- Estar formulada en positivo (evita palabras como "no", "dejar de", "parar").
- Ser amigable, alentadora y libre de presiones.
- Estar redactada completamente en ESPAÑOL.

Responde ÚNICAMENTE con un objeto JSON válido, sin formato markdown, sin texto introductorio ni explicaciones.

{
  "microtasks": [
    {
      "position": 1,
      "title": "string en español (máx 60 caracteres, lenguaje infantil y motivador)",
      "description": "string en español (opcional, 1 frase de contexto o consejo)",
      "effort_level": "easy" | "medium" | "stretch",
      "spark_value": ${reward},
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
export function fallbackDecomposition(goalTitle: string, numTasks = 21, sparkValue = 1): ParsedMicrotask[] {
  const tasks: ParsedMicrotask[] = [];
  for (let i = 1; i <= numTasks; i++) {
    tasks.push({
      position: i,
      title: `Día ${i}: ${goalTitle}`,
      effort_level: 'medium',
      spark_value: sparkValue,
      value_dimensions: [],
    });
  }
  return tasks;
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
