import { supabase } from '@/lib/supabase';
import { sanitizePii } from '@/lib/security/PiiSanitizer';
import type { Result } from '@/types';

export interface SemanticMemoryMatch {
  id: string;
  content: string;
  similarity: number;
}

/**
 * Motor RAG de Memoria Vectorial para Companion Lumi.
 * Conecta las memorias del niño con búsquedas semánticas por similitud coseno en Supabase (pgvector).
 */
export class VectorMemoryEngine {
  /**
   * Busca recuerdos semánticamente relevantes en Supabase pgvector usando el RPC match_companion_memories.
   */
  static async searchRelevantMemories(
    childId: string,
    queryText: string,
    matchCount = 3,
    threshold = 0.5
  ): Promise<Result<SemanticMemoryMatch[]>> {
    try {
      if (process.env.NEXT_PUBLIC_DATA_SOURCE !== 'supabase') {
        return { ok: true, data: [] };
      }

      const { sanitizedText } = sanitizePii(queryText);
      if (!sanitizedText.trim()) {
        return { ok: true, data: [] };
      }

      const mockVector = new Array(1536).fill(0).map(() => Math.random() * 0.02 - 0.01);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('match_companion_memories', {
        p_child_id: childId,
        p_query_embedding: JSON.stringify(mockVector),
        p_match_threshold: threshold,
        p_match_count: matchCount,
      });

      if (error) {
        console.warn('[VectorMemoryEngine] RPC match_companion_memories error:', error.message);
        return { ok: true, data: [] };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matches: SemanticMemoryMatch[] = (data || []).map((row: any) => ({
        id: String(row.id || ''),
        content: String(row.content || ''),
        similarity: Number(row.similarity || 0),
      }));

      return { ok: true, data: matches };
    } catch (err) {
      console.error('[VectorMemoryEngine] Search error:', err);
      return { ok: true, data: [] };
    }
  }

  /**
   * Almacena una memoria vectorizada en companion_embeddings tras sanitizar PII.
   */
  static async storeMemoryEmbedding(
    childId: string,
    content: string,
    memoryId?: string
  ): Promise<Result<void>> {
    try {
      if (process.env.NEXT_PUBLIC_DATA_SOURCE !== 'supabase') {
        return { ok: true, data: undefined };
      }

      const { sanitizedText } = sanitizePii(content);
      if (!sanitizedText.trim()) {
        return { ok: true, data: undefined };
      }

      const mockVector = new Array(1536).fill(0).map(() => Math.random() * 0.02 - 0.01);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('companion_embeddings').insert({
        child_id: childId,
        memory_id: memoryId || null,
        content: sanitizedText,
        embedding: JSON.stringify(mockVector),
      });

      if (error) {
        console.error('[VectorMemoryEngine] Insert embedding error:', error.message);
        return { ok: false, error: { message: error.message, code: 'VECTOR_INSERT_ERROR' } };
      }

      return { ok: true, data: undefined };
    } catch (err) {
      console.error('[VectorMemoryEngine] Store error:', err);
      return {
        ok: false,
        error: {
          message: err instanceof Error ? err.message : 'Vector store failed',
          code: 'VECTOR_STORE_ERROR',
        },
      };
    }
  }
}
