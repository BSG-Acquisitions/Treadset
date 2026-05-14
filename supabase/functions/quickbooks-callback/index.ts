// QuickBooks Online — handle the OAuth redirect from Intuit.
//
// Intuit redirects the user's browser here with `?code=...&state=...&realmId=...`
// after they authorize the app. We verify state, exchange the code for access +
// refresh tokens, encrypt them with `QUICKBOOKS_TOKEN_KEY`, upsert the row, then
// 302 the user back to the TreadSet app.
//
// Wire this URL into the Intuit Developer dashboard as the redirect URI:
//   https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/quickbooks-callback
//
// Requires verify_jwt = false (no auth header on Intuit's redirect).
//
// Env vars required:
//   QBO_CLIENT_ID                  — Intuit app client_id
//   QBO_CLIENT_SECRET              — Intuit app client_secret
//   QBO_REDIRECT_URI               — must match the URL above and what onboard sends
//   QUICKBOOKS_STATE_SECRET        — same as quickbooks-connect uses
//   QUICKBOOKS_TOKEN_KEY           — 32-byte base64 (AES-256-GCM master key)
//   QBO_APP_URL                    — TreadSet app URL for the post-redirect (default app.treadset.co)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { encryptToken, verifyState } from '../_shared/qbo-crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const appUrl = (Deno.env.get('QBO_APP_URL') ?? 'https://app.treadset.co').replace(/\/$/, '');

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const realmId = url.searchParams.get('realmId');
    const errorParam = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description');

    if (errorParam) {
      console.warn('quickbooks-callback: user denied or intuit error', errorParam, errorDesc);
      return redirect(`${appUrl}/integrations/quickbooks?status=error&reason=${encodeURIComponent(errorParam)}`);
    }
    if (!code || !state || !realmId) {
      return redirect(`${appUrl}/integrations/quickbooks?status=error&reason=missing_params`);
    }

    const clientId = Deno.env.get('QBO_CLIENT_ID');
    const clientSecret = Deno.env.get('QBO_CLIENT_SECRET');
    const redirectUri = Deno.env.get('QBO_REDIRECT_URI');
    const stateSecret = Deno.env.get('QUICKBOOKS_STATE_SECRET');
    const tokenKey = Deno.env.get('QUICKBOOKS_TOKEN_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!clientId || !clientSecret || !redirectUri || !stateSecret || !tokenKey) {
      console.error('quickbooks-callback: missing env vars');
      return redirect(`${appUrl}/integrations/quickbooks?status=error&reason=server_misconfigured`);
    }

    const stateCheck = await verifyState(state, stateSecret);
    if (!stateCheck.ok) {
      console.warn('quickbooks-callback: state verify failed', stateCheck.reason);
      return redirect(`${appUrl}/integrations/quickbooks?status=error&reason=invalid_state`);
    }
    const organizationId = stateCheck.orgId;

    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('quickbooks-callback: token exchange failed', tokenRes.status, errBody);
      return redirect(`${appUrl}/integrations/quickbooks?status=error&reason=intuit_exchange_failed`);
    }

    const tokenJson = await tokenRes.json();
    const accessToken: string | undefined = tokenJson.access_token;
    const refreshToken: string | undefined = tokenJson.refresh_token;
    const accessExpiresIn: number = Number(tokenJson.expires_in ?? 3600);
    const refreshExpiresIn: number = Number(tokenJson.x_refresh_token_expires_in ?? 8640000); // 100 days

    if (!accessToken || !refreshToken) {
      console.error('quickbooks-callback: missing tokens in response', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });
      return redirect(`${appUrl}/integrations/quickbooks?status=error&reason=intuit_no_tokens`);
    }

    const accessEnc = await encryptToken(accessToken, tokenKey);
    const refreshEnc = await encryptToken(refreshToken, tokenKey);
    const accessExpiresAt = new Date(Date.now() + accessExpiresIn * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000).toISOString();

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: upsertErr } = await supabase
      .from('quickbooks_connections')
      .upsert(
        {
          organization_id: organizationId,
          realm_id: realmId,
          access_token_encrypted: accessEnc,
          refresh_token_encrypted: refreshEnc,
          access_token_expires_at: accessExpiresAt,
          refresh_token_expires_at: refreshExpiresAt,
          status: 'active',
          last_synced_at: new Date().toISOString(),
          last_error: null,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      );

    if (upsertErr) {
      console.error('quickbooks-callback: upsert failed', upsertErr);
      return redirect(`${appUrl}/integrations/quickbooks?status=error&reason=db_write_failed`);
    }

    console.log('quickbooks-callback: connected', { organizationId, realmId });
    return redirect(`${appUrl}/integrations/quickbooks?status=connected`);
  } catch (e) {
    console.error('quickbooks-callback crashed', e);
    return redirect(`${appUrl}/integrations/quickbooks?status=error&reason=internal`);
  }
});

function redirect(to: string): Response {
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: to },
  });
}
