// Stripe Connect — handle the OAuth redirect from Stripe.
//
// Stripe redirects the user's browser here after they approve the platform on
// their Stripe account. We verify state, exchange the code for the connected
// account id, upsert the row, then 302 the user back to the TreadSet app.
//
// Wire this URL into the Stripe Connect platform settings as the redirect URI:
//   https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/stripe-connect-callback
//
// Requires verify_jwt = false (Stripe redirect carries no JWT). Set in dashboard
// or via supabase/config.toml in a follow-up PR after #18 lands.
//
// Env vars required:
//   STRIPE_SECRET_KEY              — platform secret key (already used by create-payment)
//   STRIPE_CONNECT_STATE_SECRET    — same secret used by stripe-connect-onboard
//   STRIPE_CONNECT_APP_URL         — TreadSet app URL to redirect back to (e.g. https://app.treadset.co)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STATE_MAX_AGE_MS = 15 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const appUrl = (Deno.env.get('STRIPE_CONNECT_APP_URL') ?? 'https://app.treadset.co').replace(/\/$/, '');

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description');

    // Stripe sends an error param if the user denies or something goes wrong on their side.
    if (errorParam) {
      console.warn('stripe-connect-callback: user denied or stripe error', errorParam, errorDesc);
      return redirect(`${appUrl}/integrations/stripe?status=error&reason=${encodeURIComponent(errorParam)}`);
    }

    if (!code || !state) {
      return redirect(`${appUrl}/integrations/stripe?status=error&reason=missing_code_or_state`);
    }

    const stateSecret = Deno.env.get('STRIPE_CONNECT_STATE_SECRET');
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!stateSecret || !stripeSecret) {
      console.error('stripe-connect-callback: missing env vars');
      return redirect(`${appUrl}/integrations/stripe?status=error&reason=server_misconfigured`);
    }

    const stateCheck = await verifyState(state, stateSecret);
    if (!stateCheck.ok) {
      console.warn('stripe-connect-callback: state verify failed', stateCheck.reason);
      return redirect(`${appUrl}/integrations/stripe?status=error&reason=invalid_state`);
    }
    const organizationId = stateCheck.orgId;

    // Exchange the OAuth code for the connected account id.
    const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_secret: stripeSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('stripe-connect-callback: token exchange failed', tokenRes.status, errBody);
      return redirect(`${appUrl}/integrations/stripe?status=error&reason=stripe_exchange_failed`);
    }

    const tokenJson = await tokenRes.json();
    const stripeAccountId = tokenJson.stripe_user_id as string | undefined;
    if (!stripeAccountId) {
      console.error('stripe-connect-callback: no stripe_user_id in response', tokenJson);
      return redirect(`${appUrl}/integrations/stripe?status=error&reason=stripe_no_account_id`);
    }

    // Fetch account capabilities so we know whether they can take charges yet.
    const acctRes = await fetch(`https://api.stripe.com/v1/accounts/${stripeAccountId}`, {
      headers: { 'Authorization': `Bearer ${stripeSecret}` },
    });
    let chargesEnabled = false;
    let payoutsEnabled = false;
    let detailsSubmitted = false;
    let defaultCurrency: string | null = null;
    if (acctRes.ok) {
      const acct = await acctRes.json();
      chargesEnabled = !!acct.charges_enabled;
      payoutsEnabled = !!acct.payouts_enabled;
      detailsSubmitted = !!acct.details_submitted;
      defaultCurrency = acct.default_currency ?? null;
    } else {
      console.warn('stripe-connect-callback: account fetch non-ok', acctRes.status);
    }

    const status = chargesEnabled
      ? 'active'
      : detailsSubmitted
      ? 'restricted'
      : 'pending';

    // Service-role client — table has no client INSERT policy by design.
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: upsertErr } = await supabase
      .from('stripe_connect_accounts')
      .upsert(
        {
          organization_id: organizationId,
          stripe_account_id: stripeAccountId,
          status,
          details_submitted: detailsSubmitted,
          charges_enabled: chargesEnabled,
          payouts_enabled: payoutsEnabled,
          default_currency: defaultCurrency ?? 'usd',
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      );

    if (upsertErr) {
      console.error('stripe-connect-callback: upsert failed', upsertErr);
      return redirect(`${appUrl}/integrations/stripe?status=error&reason=db_write_failed`);
    }

    console.log('stripe-connect-callback: connected', { organizationId, stripeAccountId, status });
    return redirect(`${appUrl}/integrations/stripe?status=connected`);
  } catch (e) {
    console.error('stripe-connect-callback crashed', e);
    return redirect(`${appUrl}/integrations/stripe?status=error&reason=internal`);
  }
});

function redirect(to: string): Response {
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: to },
  });
}

async function verifyState(
  state: string,
  secret: string
): Promise<{ ok: true; orgId: string } | { ok: false; reason: string }> {
  const [payloadB64, sigUrlSafe] = state.split('.');
  if (!payloadB64 || !sigUrlSafe) return { ok: false, reason: 'malformed state' };

  let payload: string;
  try {
    payload = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return { ok: false, reason: 'bad payload encoding' };
  }

  const [orgId, tsStr] = payload.split('.');
  const ts = Number(tsStr);
  if (!orgId || !Number.isFinite(ts)) return { ok: false, reason: 'bad payload format' };
  if (Date.now() - ts > STATE_MAX_AGE_MS) return { ok: false, reason: 'state expired' };

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expectedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  if (!constantTimeEqual(sigUrlSafe, expectedB64)) return { ok: false, reason: 'signature mismatch' };
  return { ok: true, orgId };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
