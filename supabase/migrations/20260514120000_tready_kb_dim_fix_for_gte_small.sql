-- Build 3 — fix tready_kb.embedding dimension for Supabase's gte-small model
--
-- The V1 scaffold declared `embedding vector(1536)` (OpenAI ada-002 size),
-- but we're using Supabase's built-in `Supabase.ai.Session('gte-small')`
-- which produces 384-dimension vectors. No external embedding API needed
-- (no OpenAI/Voyage key required).
--
-- Safe to run: there are zero rows in tready_kb yet (verified before
-- writing this migration — it's a brand-new table from V1 scaffold).
-- DROP COLUMN avoids the type-conversion problem.
--
-- Idempotent: uses IF EXISTS / IF NOT EXISTS where Postgres allows it.
-- Reverses cleanly: re-create at vector(1536) and re-create the index.

BEGIN;

-- 1. Drop the old vector index first (it depends on the column)
DROP INDEX IF EXISTS public.idx_tready_kb_embedding;

-- 2. Drop and re-add the column at the right dimension
ALTER TABLE public.tready_kb DROP COLUMN IF EXISTS embedding;
ALTER TABLE public.tready_kb ADD COLUMN embedding vector(384);

-- 3. Re-create the cosine-similarity index at the new dimension
-- ivfflat with lists=100 is fine until we have >10k rows; tune later.
CREATE INDEX idx_tready_kb_embedding
  ON public.tready_kb
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMIT;

-- Verification (run separately if you want):
-- SELECT atttypmod, format_type(atttypid, atttypmod) AS data_type
--   FROM pg_attribute
--  WHERE attrelid = 'public.tready_kb'::regclass AND attname = 'embedding';
-- Expected: vector(384)
