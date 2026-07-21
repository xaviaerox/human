import type { EffortLevel } from '@/types';

export interface AIMicrotaskSuggestion {
  title: string;
  effort: EffortLevel;
  description?: string;
}

export interface AIDecomposeResult {
  microtasks: AIMicrotaskSuggestion[];
  source: 'ai' | 'fallback';
}

export async function decomposeGoalWithAI(goalTitle: string): Promise<AIDecomposeResult> {
  const cleanTitle = goalTitle.trim();
  if (!cleanTitle) {
    return { microtasks: getFallbackMicrotasks(cleanTitle), source: 'fallback' };
  }

  const prompt = `Descompón la meta "${cleanTitle}" para un niño neurodivergente en exactamente 3 microtareas progresivas y motivadoras que se puedan completar en 5 a 10 minutos.

Responde ÚNICAMENTE con un JSON válido con este formato:
{
  "microtasks": [
    {
      "title": "Nombre corto del paso 1 (Fácil)",
      "effort": "easy",
      "description": "Una frase de ánimo corta"
    },
    {
      "title": "Nombre corto del paso 2 (Práctica)",
      "effort": "medium",
      "description": "Una frase de ánimo corta"
    },
    {
      "title": "Nombre corto del paso 3 (Desafío)",
      "effort": "stretch",
      "description": "Una frase de ánimo corta"
    }
  ]
}`;

  try {
    const res = await fetch('/api/decompose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (parsed.microtasks && Array.isArray(parsed.microtasks) && parsed.microtasks.length > 0) {
          const validated: AIMicrotaskSuggestion[] = parsed.microtasks.slice(0, 3).map((item: Record<string, unknown>, idx: number) => ({
            title: String(item.title || `Paso ${idx + 1}`),
            effort: item.effort === 'easy' || item.effort === 'medium' || item.effort === 'stretch' ? (item.effort as EffortLevel) : idx === 0 ? 'easy' : idx === 1 ? 'medium' : 'stretch',
            description: item.description ? String(item.description) : undefined,
          }));

          return { microtasks: validated, source: 'ai' };
        }
      }
    }
  } catch (err) {
    console.warn('[decomposeAI] Error fetching AI microtasks, fallback used:', err);
  }

  return { microtasks: getFallbackMicrotasks(cleanTitle), source: 'fallback' };
}

function getFallbackMicrotasks(title: string): AIMicrotaskSuggestion[] {
  return [
    {
      title: `Explorar y preparar los materiales para ${title || 'la meta'}`,
      effort: 'easy',
      description: 'Dar el primer paso sencillo sin presiones.',
    },
    {
      title: `Practicar 5 minutos concentrado`,
      effort: 'medium',
      description: 'Avanzar un poquito más a tu ritmo.',
    },
    {
      title: `Completar el reto principal`,
      effort: 'stretch',
      description: 'Demostrar tu gran esfuerzo y conseguir el logro.',
    },
  ];
}
