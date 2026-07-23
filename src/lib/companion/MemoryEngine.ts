import type { CompanionMemory, DialogueLine, CompanionStage } from '@/types';
import { resolveAnimationCue } from './dialogue/DialogueBank';
import { supabase } from '@/lib/supabase';

/**
 * Checks if there is a relevant active memory to mention and generates a custom DialogueLine.
 * Returns null if no relevant memory is found or if it chooses to fall back to standard bank.
 */
export function selectMemoryDialogue(
  memories: CompanionMemory[],
  stage: CompanionStage,
  _companionName: string
): DialogueLine | null {
  // If stage is egg, the companion cannot speak
  if (stage === 'egg') return null;

  // Filter active memories
  const active = memories.filter(m => m.is_active);
  if (active.length === 0) return null;

  // Pick the most recent memory
  const latest = active.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  if (!latest) return null;

  let text = '';
  switch (latest.memory_type) {
    case 'routine_streak_milestone': {
      const rTitle = latest.metadata.routine_title ?? 'tu rutina';
      text = `He estado pensando en lo constante que has sido con la rutina de "${rTitle}". ¡Eso es genial!`;
      break;
    }

    case 'difficult_checkin': {
      const emoDetail = latest.metadata.emotion_word ? ` (${latest.metadata.emotion_word})` : '';
      text = `Ayer te sentías un poco abrumado o cansado${emoDetail}. Quería decirte que estoy aquí contigo hoy, sin prisa.`;
      break;
    }

    case 'adventure_complete': {
      const advTitle = latest.metadata.adventure_title ?? 'tu aventura';
      text = `¡Aún me acuerdo de cuando completamos juntos la aventura de "${advTitle}"! Fue un paso muy bonito.`;
      break;
    }

    case 'parent_badge_award': {
      const bName = latest.metadata.badge_name ?? 'valores';
      text = `¡Mira! Tus papás te han dejado una insignia de "${bName}" en tus recuerdos. ¿Vamos a verla juntos?`;
      break;
    }

    default:
      return null;
  }

  // Calculate duration
  const BASE = 3000;
  const PER_CHAR = 40;
  const durationMs = Math.min(7000, BASE + text.length * PER_CHAR);

  // Return custom dialogue line
  return {
    text,
    animationCue: resolveAnimationCue(stage, 'idle_presence'),
    durationMs,
  };
}

export interface SemanticMemoryMatch {
  id: string;
  content: string;
  similarity: number;
}

/**
 * Searches for the top N semantically relevant memories using pgvector cosine search.
 * Falls back gracefully to filtering active memories by keyword in offline/static mode.
 */
export async function searchSemanticMemories(
  childId: string,
  queryText: string,
  memoriesFallback: CompanionMemory[] = [],
  limit = 3
): Promise<SemanticMemoryMatch[]> {
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase' && supabase) {
    try {
      // In Supabase mode, call the match_companion_memories RPC
      const rpcCall = supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      const { data, error } = await rpcCall('match_companion_memories', {
        p_child_id: childId,
        p_match_count: limit,
        p_match_threshold: 0.3,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as SemanticMemoryMatch[];
      }
    } catch (err) {
      console.warn('[MemoryEngine] Semantic search RPC fallback:', err);
    }
  }

  // Fallback: Keyword search over active memories
  const queryLower = queryText.toLowerCase();
  const matched = memoriesFallback
    .filter(m => m.is_active)
    .map(m => {
      let content = '';
      if (m.memory_type === 'routine_streak_milestone') {
        content = `Constancia en rutina ${m.metadata.routine_title || ''}`;
      } else if (m.memory_type === 'adventure_complete') {
        content = `Completó aventura ${m.metadata.adventure_title || ''}`;
      } else if (m.memory_type === 'parent_badge_award') {
        content = `Insignia de padres ${m.metadata.badge_name || ''}: ${m.metadata.parent_note || ''}`;
      } else if (m.memory_type === 'difficult_checkin') {
        content = `Check-in difícil: ${m.metadata.emotion_word || ''}`;
      }

      const isMatch = queryLower ? content.toLowerCase().includes(queryLower) : true;
      return {
        id: m.id,
        content,
        similarity: isMatch ? 0.9 : 0.5,
      };
    })
    .slice(0, limit);

  return matched;
}
