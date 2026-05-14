-- =============================================================================
-- Stripe Connect schema (Standard accounts per tenant)
-- =============================================================================
-- WHAT: Creates `stripe_connect_accounts` (one row per tenant's connected
--       Stripe account) and `stripe_events` (idempotent inbound webhook log).
--
-- WHY:  Each TreadSet tenant connects their OWN Stripe account so they bill
--       their own clients directly. TreadSet does not custody funds. Standard
--       Connect (not Express) — tenants retain their own Stripe relationship.
--       The `stripe_events` table gates webhook idempotency: every Stripe event
--       inserts here first, and the downstream durable workflow keys off
--       `stripe_event_id` to never double-process.
--
-- REVERSES (rollback script, save separately if needed):
--   DROP TABLE IF EXISTS public.stripe_events;
--   DROP TABLE IF EXISTS public.stripe_connect_accounts;
--
-- DEPLOY DISCIPLINE (per CLAUDE.md rule 3):
--   - Migration file written, NOT auto-applied.
--   - Hand to Z. Z pastes into Supabase SQL editor for project wvjehbozyxhmgdljwsiz.
--   - Verify RLS after apply: SELECT * FROM stripe_connect_accounts as the
--     demo user — should return zero rows until OAuth flow is built.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) stripe_connect_accounts — one row per tenant, holds connected account id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_account_id   text NOT NULL UNIQUE,                       -- 'acct_1Abc...'
  status              text NOT NULL CHECK (status IN ('pending','active','disabled','restricted')),
  details_submitted   boolean NOT NULL DEFAULT false,
  charges_enabled     boolean NOT NULL DEFAULT false,
  payouts_enabled     boolean NOT NULL DEFAULT false,
  default_currency    text DEFAULT 'usd',
  connected_at        timestamptz NOT NULL DEFAULT now(),
  last_synced_at      timestamptz,
  metadata            jsonb
);

COMMENT ON TABLE public.stripe_connect_accounts IS
  'One row per tenant that has connected a Stripe account via Connect OAuth. Standard accounts — tenants own their Stripe relationship.';

CREATE INDEX IF NOT EXISTS idx_stripe_connect_status ON public.stripe_connect_accounts (status);

-- ---------------------------------------------------------------------------
-- 2) stripe_events — idempotent inbound webhook log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id     text NOT NULL UNIQUE,                       -- 'evt_1Abc...' — idempotency key
  organization_id     uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type          text NOT NULL,                              -- 'charge.succeeded', 'payment_intent.payment_failed', etc.
  payload             jsonb NOT NULL,
  processed           boolean NOT NULL DEFAULT false,
  processed_at        timestamptz,
  error_message       text,
  received_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stripe_events IS
  'Inbound Stripe webhook events. stripe_event_id is the idempotency key; webhook receiver returns early if already inserted.';

CREATE INDEX IF NOT EXISTS idx_stripe_events_org_received ON public.stripe_events (organization_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_events_unprocessed ON public.stripe_events (received_at DESC) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_stripe_events_type        ON public.stripe_events (event_type, received_at DESC);

-- ---------------------------------------------------------------------------
-- 3) RLS — tenants see their own row only; writes are service-role only
-- ---------------------------------------------------------------------------
-- stripe_connect_accounts: org admins SELECT their row. INSERT/UPDATE goes
-- through the edge function with service-role (no client-facing writes).
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_stripe_connect_select ON public.stripe_connect_accounts;
CREATE POLICY p_stripe_connect_select ON public.stripe_connect_accounts FOR SELECT
  USING (public.is_org_admin(organization_id));

-- stripe_events: org admins SELECT their org's events. Service-role only writes.
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_stripe_events_select ON public.stripe_events;
CREATE POLICY p_stripe_events_select ON public.stripe_events FOR SELECT
  USING (
    organization_id IS NULL  -- unscoped events (pre-tenant-resolution) visible to super-admin via service-role only
    OR public.is_org_admin(organization_id)
  );

-- ---------------------------------------------------------------------------
-- 4) Updated-at trigger reuse (matches existing TreadSet convention)
-- ---------------------------------------------------------------------------
-- stripe_connect_accounts uses last_synced_at instead of updated_at — no trigger needed.
-- stripe_events is append-mostly; no updated_at column.

-- =============================================================================
-- DONE. After apply, regenerate types:
--   supabase gen types typescript --project-id wvjehbozyxhmgdljwsiz > src/integrations/supabase/types.ts
-- =============================================================================
