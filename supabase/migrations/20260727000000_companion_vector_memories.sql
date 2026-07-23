-- Migration: Enable pgvector and create semantic memory RAG store for Companion Lumi
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Table for storing dense vector embeddings of child memories and check-in history
CREATE TABLE IF NOT EXISTS public.companion_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES public.companion_memories(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL, -- 1536-dimensional vector (OpenAI text-embedding-3-small / Gemini compatible)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Row Level Security
ALTER TABLE public.companion_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their family's child embeddings" ON public.companion_embeddings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.family_members fm_current
            JOIN public.family_members fm_target ON fm_current.family_id = fm_target.family_id
            WHERE fm_current.user_id = auth.uid()
            AND fm_target.user_id = companion_embeddings.child_id
        )
    );

CREATE POLICY "Users can insert embeddings for their family children" ON public.companion_embeddings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members fm_current
            JOIN public.family_members fm_target ON fm_current.family_id = fm_target.family_id
            WHERE fm_current.user_id = auth.uid()
            AND fm_target.user_id = companion_embeddings.child_id
        )
    );

-- Fast HNSW cosine similarity index
CREATE INDEX IF NOT EXISTS companion_embeddings_hnsw_idx 
ON public.companion_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- RPC Function for RAG semantic search with explicit search_path
CREATE OR REPLACE FUNCTION public.match_companion_memories(
    p_child_id UUID,
    p_query_embedding vector(1536),
    p_match_threshold FLOAT DEFAULT 0.6,
    p_match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.content,
        1 - (ce.embedding <=> p_query_embedding) AS similarity
    FROM public.companion_embeddings ce
    WHERE ce.child_id = p_child_id
      AND 1 - (ce.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY ce.embedding <=> p_query_embedding ASC
    LIMIT p_match_count;
END;
$$;
