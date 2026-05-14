-- =============================================================================
-- QuickBooks Online (QBO) connection schema — per-tenant OAuth 2.0 + sync log
-- =============================================================================
-- WHAT: Creates `quickbooks_connections` (one row per tenant, holding encrypted
--       OAuth tokens + connection state) and `quickbooks_sync_log` (per-entity
--       sync audit trail).
--
-- WHY:  Every TreadSet tenant connects their OWN QBO company. We push invoices
--       and payments to QBO; we read customer/item lists for reference. Each
--       tenant owns their refresh token (100-day lifespan); re-auth prompts
--       are tenant-admin facing.
--
-- TOKEN HANDLING — CRITICAL:
--   - `access_token_encrypted` and `refresh_token_encrypted` MUST contain
--     ciphertext, never plaintext. The edge function performs encryption
--     using Supabase Vault or pgsodium with a master key from project secrets
--     (env var `QUICKBOOKS_TOKEN_KEY`).
--   - RLS on `quickbooks_connections` has NO client SELECT policy: tokens
--     are only readable via service-role from the edge function. The frontend
--     uses a separate status RPC (forthcoming) to surface connection state.
--
-- REVERSES (rollback script):
--   DROP TABLE IF EXISTS public.quickbooks_sync_log;
--   DROP TABLE IF EXISTS public.quickbooks_connections;
--
-- DEPLOY DISCIPLINE (per CLAUDE.md rule 3):
--   - Migration written, NOT auto-applied.
--   - Hand to Z. Z pastes into Supabase SQL editor for project wvjehbozyxhmgdljwsiz.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) quickbooks_connections — one row per tenant
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quickbooks_connections (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id               uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  realm_id                      text NOT NULL,                 -- QBO company id
  access_token_encrypted        text NOT NULL,                 -- CIPHERTEXT ONLY
  refresh_token_encrypted       text NOT NULL,                 -- CIPHERTEXT ONLY
  access_token_expires_at       timestamptz NOT NULL,
  refresh_token_expires_at      timestamptz NOT NULL,
  status                        text NOT NULL CHECK (status IN ('active','expired','revoked','error')),
  last_synced_at                timestamptz,
  last_error                    text,
  connected_at                  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quickbooks_connections IS
  'Per-tenant QBO OAuth state. Tokens are encrypted; only the QBO sync edge function (service-role) can decrypt.';
COMMENT ON COLUMN public.quickbooks_connections.access_token_encrypted IS
  'CIPHERTEXT ONLY. Encrypted by the QBO sync edge function with QUICKBOOKS_TOKEN_KEY. Never store plaintext.';
COMMENT ON COLUMN public.quickbooks_connections.refresh_token_encrypted IS
  'CIPHERTEXT ONLY. Encrypted by the QBO sync edge function with QUICKBOOKS_TOKEN_KEY. Never store plaintext.';

CREATE INDEX IF NOT EXISTS idx_qbo_conn_status      ON public.quickbooks_connections (status);
CREATE INDEX IF NOT EXISTS idx_qbo_conn_expiring    ON public.quickbooks_connections (refresh_token_expires_at)
  WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- 2) quickbooks_sync_log — per-entity sync audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quickbooks_sync_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type         text NOT NULL,                           -- 'invoice','payment','customer','item'
  treadset_entity_id  uuid NOT NULL,                           -- our row id (e.g. invoices.id)
  qbo_entity_id       text,                                    -- QBO's id once synced
  direction           text NOT NULL CHECK (direction IN ('to_qbo','from_qbo')),
  status              text NOT NULL CHECK (status IN ('pending','success','failed','skipped')),
  error_message       text,
  payload_snapshot    jsonb,                                   -- the body we sent/received (for debugging)
  synced_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quickbooks_sync_log IS
  'One row per attempted entity sync to/from QBO. Append-only; pruned on a retention schedule (TBD).';

CREATE INDEX IF NOT EXISTS idx_qbo_log_org_synced   ON public.quickbooks_sync_log (organization_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_qbo_log_entity       ON public.quickbooks_sync_log (entity_type, treadset_entity_id);
CREATE INDEX IF NOT EXISTS idx_qbo_log_failed       ON public.quickbooks_sync_log (organization_id, synced_at DESC)
  WHERE status = 'failed';

-- ---------------------------------------------------------------------------
-- 3) RLS — connections are service-role only; sync log readable by admins
-- ---------------------------------------------------------------------------
-- quickbooks_connections: RLS enabled, NO policies = service-role-only access.
-- Tokens are never client-readable. Status surface comes from a future RPC.
ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;
-- intentionally no SELECT/INSERT/UPDATE/DELETE policies — only service-role reaches this table.

-- quickbooks_sync_log: org admins read their org's log for ops dashboards.
ALTER TABLE public.quickbooks_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_qbo_log_select ON public.quickbooks_sync_log;
CREATE POLICY p_qbo_log_select ON public.quickbooks_sync_log FOR SELECT
  USING (public.is_org_admin(organization_id));

-- =============================================================================
-- DONE. After apply:
--   1. Set Supabase project secret QUICKBOOKS_TOKEN_KEY (32-byte random base64).
--   2. Regenerate types:
--      supabase gen types typescript --project-id wvjehbozyxhmgdljwsiz > src/integrations/supabase/types.ts
--   3. (Separate PR) build status RPC `get_quickbooks_connection_status(org_id uuid)`
--      that returns { connected, status, last_synced_at, realm_id, last_error }
--      WITHOUT exposing tokens. Frontend consumes this.
-- =============================================================================
