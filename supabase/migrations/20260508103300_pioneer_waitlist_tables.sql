-- =============================================================
-- Migration: Pioneer Program signups + Waitlist
-- Date: 2026-05-08
-- Why:
--   Tradeshow rollout (Denver, mid-May 2026) introduces a charter
--   "Pioneer Program" — one processor per state — captured on the
--   printed trifold via QR.  This migration creates the two public
--   lead-capture tables backing /pioneer and /waitlist on
--   app.treadset.co.
-- What:
--   - public.pioneers   : one-per-state charter signup
--   - public.waitlist   : "missed the window" backup capture
--   - RLS: anon + authenticated may INSERT only.  No public SELECT.
--     Z reads via Supabase dashboard (service_role).
-- Reverses:
--   DROP TABLE public.pioneers;
--   DROP TABLE public.waitlist;
-- Notes:
--   Pioneer enforces "one per state" via UNIQUE constraint on
--   state_code.  A duplicate INSERT raises 23505; the form catches
--   that and tells the user the state is taken.
-- =============================================================

-- ---------- pioneers ----------
CREATE TABLE IF NOT EXISTS public.pioneers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  text        NOT NULL,
  state_code    text        NOT NULL,
  contact_name  text        NOT NULL,
  email         text        NOT NULL,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pioneers_state_unique  UNIQUE (state_code),
  CONSTRAINT pioneers_state_2char   CHECK (length(state_code) = 2),
  CONSTRAINT pioneers_email_format  CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE INDEX IF NOT EXISTS pioneers_created_at_idx
  ON public.pioneers (created_at DESC);

ALTER TABLE public.pioneers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pioneers_anon_insert ON public.pioneers;
CREATE POLICY pioneers_anon_insert
  ON public.pioneers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies → service_role only.

-- ---------- waitlist ----------
CREATE TABLE IF NOT EXISTS public.waitlist (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  email         text        NOT NULL,
  company_name  text,
  state_code    text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_format CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT waitlist_state_2char  CHECK (state_code IS NULL OR length(state_code) = 2)
);

CREATE INDEX IF NOT EXISTS waitlist_created_at_idx
  ON public.waitlist (created_at DESC);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waitlist_anon_insert ON public.waitlist;
CREATE POLICY waitlist_anon_insert
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies → service_role only.
