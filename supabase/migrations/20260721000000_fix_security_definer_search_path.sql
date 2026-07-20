-- ============================================================
-- MIRA — Security Hardening: Fix search_path on SECURITY DEFINER functions
-- Prevents schema hijacking vulnerabilities in PostgreSQL
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.prosecdef = true
    LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
    END LOOP;
END $$;
