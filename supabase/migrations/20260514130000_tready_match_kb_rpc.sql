-- Build 3 — match_tready_kb RPC for vector similarity search
--
-- Tready's `search_kb` tool calls this. Returns top-N tready_kb rows
-- ordered by cosine similarity to the query embedding, scoped to:
--   - GLOBAL entries (organization_id IS NULL), AND
--   - the caller's tenant entries (organization_id = match_org_id)
--
-- Filters out expired entries.
--
-- SECURITY DEFINER + explicit org scoping in the WHERE clause.
-- Cannot leak across tenants because the org_id is passed as an
-- argument from the edge function (which derived it server-side
-- from the JWT — model cannot override).

BEGIN;

CREATE OR REPLACE FUNCTION public.match_tready_kb(
  query_embedding vector(384),
  match_org_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  topic text,
  content text,
  source text,
  confidence numeric,
  organization_id uuid,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    kb.id,
    kb.topic,
    kb.content,
    kb.source,
    kb.confidence,
    kb.organization_id,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.tready_kb kb
  WHERE
    -- Tenant scope: globals + caller's tenant only
    (kb.organization_id IS NULL OR kb.organization_id = match_org_id)
    -- Active entries only
    AND (kb.expires_at IS NULL OR kb.expires_at > now())
    -- Embedded entries only (skip rows where embedding wasn't computed)
    AND kb.embedding IS NOT NULL
  ORDER BY kb.embedding <=> query_embedding
  LIMIT GREATEST(match_count, 1);
$$;

-- Tighten ownership / grants per CLAUDE.md operating rule #6
REVOKE EXECUTE ON FUNCTION public.match_tready_kb FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_tready_kb TO authenticated, service_role;

COMMENT ON FUNCTION public.match_tready_kb IS
  'Vector similarity search for Tready KB. Org-scoped (caller passes org_id). Returns top-N matches by cosine similarity, including globals.';

COMMIT;
