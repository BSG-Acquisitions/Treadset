-- Migration: manifest_edit_history
--
-- WHY: After-the-fact edits to completed/in-flight manifests need an audit
-- trail. Drivers occasionally log the wrong tire category (e.g., commercial
-- 22.5" instead of PTE off-rim) and dispatchers correct it before the yard
-- receiver signs. Today there's no record of who changed what, when, or why.
-- That fails compliance and the future Re-TRAC integration which needs full
-- audit history per load.
--
-- WHAT: Adds an `edit_history` jsonb column to public.manifests, defaulted
-- to []. The application appends one entry per edit:
--   {
--     "at": "<iso timestamp>",
--     "by_user_id": "<uuid>",
--     "by_email": "<email>",
--     "reason": "<dispatcher-supplied text>",
--     "changed": ["pte_off_rim","commercial_22_5_off","total","weight_tons", ...],
--     "before": { ...subset of fields ... },
--     "after":  { ...subset of fields ... }
--   }
--
-- The column is org-scoped via the existing manifests RLS — no new policy
-- required. Read access mirrors manifest read access; write access mirrors
-- the existing manifests UPDATE policy (admin / super_admin / ops_manager
-- / dispatcher within the same organization).
--
-- REVERSE: ALTER TABLE public.manifests DROP COLUMN edit_history;
--
-- SAFETY: idempotent (`ADD COLUMN IF NOT EXISTS`), no rewrite — Postgres
-- adds nullable jsonb columns instantly. No downtime, no lock escalation.

ALTER TABLE public.manifests
  ADD COLUMN IF NOT EXISTS edit_history jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.manifests.edit_history IS
  'Append-only audit log of post-creation edits to this manifest. Maintained by application code (see EditManifestDialog). Required for compliance and Re-TRAC integration.';
