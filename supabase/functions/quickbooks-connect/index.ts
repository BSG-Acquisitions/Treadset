// QuickBooks Online — start the OAuth flow.
//
// Caller must be authenticated and have the `admin` role in their org.
// Returns the Intuit OAuth authorize URL the tenant admin will be sent to.
// Intuit redirects back to `quickbooks-callback` after authorization.
//
// Env vars required:
//   QBO_CLIENT_ID                  — Intuit app client_id
//   QBO_REDIRECT_URI               — public URL of quickbooks-callback (must match
//                                    what's registered in Intuit Developer dashboard)
//   QUICKBOOKS_STATE_SECRET        — random 32-byte base64 (HMAC-SHA256 state key)
//   QBO_ENVIRONMENT                — 'sandbox' (default) or 'production'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { signState } from '../_shared/qbo-crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const QBO_SCOPE = 'com.intuit.quickbooks.accounting';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const clientId = Deno.env.get('QBO_CLIENT_ID');
    const redirectUri = Deno.env.get('QBO_REDIRECT_URI');
    const stateSecret = Deno.env.get('QUICKBOOKS_STATE_SECRET');

    if (!clientId || !redirectUri || !stateSecret) {
      console.error('quickbooks-connect: missing env vars');
      return json({ error: 'quickbooks not configured' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authUser, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authUser?.user) return json({ error: 'invalid session' }, 401);

    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.user.id)
      .maybeSingle();
    if (!userRow) return json({ error: 'user record missing' }, 403);

    const { data: roleRow } = await supabase
      .from('user_organization_roles')
      .select('organization_id, role')
      .eq('user_id', userRow.id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (!roleRow) return json({ error: 'must be an org admin to connect QuickBooks' }, 403);
    const organizationId = roleRow.organization_id as string;

    // Surface existing connection status (without ever returning tokens).
    // The frontend uses this to render "Reconnect" vs "Connect".
    // Note: stripe_connect_accounts is readable by org admins via RLS; quickbooks_connections
    // is service-role only, so we use service-role to peek.
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminSupabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: existing } = await adminSupabase
      .from('quickbooks_connections')
      .select('status, realm_id, last_synced_at, refresh_token_expires_at')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const state = await signState(organizationId, stateSecret);

    const oauthUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
    oauthUrl.searchParams.set('client_id', clientId);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', QBO_SCOPE);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('state', state);

    return json({ url: oauthUrl.toString(), existing: existing ?? null });
  } catch (e) {
    console.error('quickbooks-connect crashed', e);
    return json({ error: 'internal' }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
