-- =============================================================================
-- Integration status RPCs — safe surface for frontend to query connection state
-- =============================================================================
-- WHAT: Adds two SECURITY DEFINER functions that return connection status for
--       Stripe Connect and QuickBooks Online to authenticated callers in the
--       org. Never returns OAuth tokens. The QBO function exists specifically
--       because quickbooks_connections has NO client RLS policies — tokens
--       live there but only this RPC exposes the safe fields.
--
-- WHY:  Frontend needs to render "Connected / Reconnect / Connect" UI without
--       having a raw SELECT path to either table. Stripe's table has admin-
--       readable RLS (could be queried directly) but uniform interface is
--       cleaner. QBO's table is service-role only, so an RPC is required.
--
-- DEPENDS ON:
--   - PR #20 (stripe_connect_accounts table) applied
--   - PR #21 (quickbooks_connections table) applied
--   - public.is_org_admin(uuid) helper (exists; used by existing RLS policies)
--
-- REVERSES (rollback):
--   DROP FUNCTION IF EXISTS public.get_quickbooks_connection_status(uuid);
--   DROP FUNCTION IF EXISTS public.get_stripe_connection_status(uuid);
--
-- DEPLOY DISCIPLINE: paste-flow per CLAUDE.md rule 3.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- get_stripe_connection_status(p_org_id) — safe Stripe status for the frontend
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_stripe_connection_status(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.stripe_connect_accounts%ROWTYPE;
BEGIN
  -- Permission check: caller must be admin in the requested org.
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'insufficient permissions' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.stripe_connect_accounts
  WHERE organization_id = p_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('connected', false);
  END IF;

  RETURN jsonb_build_object(
    'connected', true,
    'status', v_row.status,
    'stripe_account_id', v_row.stripe_account_id,
    'charges_enabled', v_row.charges_enabled,
    'payouts_enabled', v_row.payouts_enabled,
    'details_submitted', v_row.details_submitted,
    'default_currency', v_row.default_currency,
    'connected_at', v_row.connected_at,
    'last_synced_at', v_row.last_synced_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_stripe_connection_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stripe_connection_status(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_stripe_connection_status(uuid) IS
  'Returns redacted Stripe Connect status for the given org. Admin-only. Never returns tokens.';

-- ---------------------------------------------------------------------------
-- get_quickbooks_connection_status(p_org_id) — safe QBO status for the frontend
-- ---------------------------------------------------------------------------
-- IMPORTANT: this RPC is the ONLY path by which the frontend can see anything
-- about a QBO connection — quickbooks_connections has no client RLS policies.
-- The RPC exposes safe metadata (status, realm_id, timestamps, days remaining)
-- and explicitly NEVER returns access_token_encrypted or refresh_token_encrypted.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_quickbooks_connection_status(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.quickbooks_connections%ROWTYPE;
BEGIN
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'insufficient permissions' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.quickbooks_connections
  WHERE organization_id = p_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('connected', false);
  END IF;

  RETURN jsonb_build_object(
    'connected', true,
    'status', v_row.status,
    'realm_id', v_row.realm_id,
    'connected_at', v_row.connected_at,
    'last_synced_at', v_row.last_synced_at,
    'last_error', v_row.last_error,
    'access_token_expires_at', v_row.access_token_expires_at,
    'refresh_token_expires_at', v_row.refresh_token_expires_at,
    'refresh_token_days_remaining',
      GREATEST(0, EXTRACT(EPOCH FROM (v_row.refresh_token_expires_at - now())) / 86400)::int
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_quickbooks_connection_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quickbooks_connection_status(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_quickbooks_connection_status(uuid) IS
  'Returns redacted QuickBooks status for the given org. Admin-only. NEVER returns OAuth tokens — only timestamps, status, and realm_id.';

-- =============================================================================
-- After apply, frontend usage:
--   const { data } = await supabase.rpc('get_stripe_connection_status', { p_org_id: orgId });
--   const { data } = await supabase.rpc('get_quickbooks_connection_status', { p_org_id: orgId });
-- Regenerate types:
--   supabase gen types typescript --project-id wvjehbozyxhmgdljwsiz > src/integrations/supabase/types.ts
-- =============================================================================
