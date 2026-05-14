// Stripe Connect — start the OAuth flow.
//
// Caller must be authenticated and have the `admin` role in their org.
// Returns the Stripe Connect authorize URL the tenant admin will be sent to.
// Stripe redirects back to `stripe-connect-callback` after authorization.
//
// Env vars required:
//   STRIPE_CONNECT_CLIENT_ID       — Stripe Connect platform id, starts with `ca_`
//   STRIPE_CONNECT_REDIRECT_URI    — the public URL of stripe-connect-callback
//   STRIPE_CONNECT_STATE_SECRET    — random 32-byte base64 (HMAC-SHA256 key for tamper-proofing state)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STATE_MAX_AGE_MS = 15 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const clientId = Deno.env.get('STRIPE_CONNECT_CLIENT_ID');
    const redirectUri = Deno.env.get('STRIPE_CONNECT_REDIRECT_URI');
    const stateSecret = Deno.env.get('STRIPE_CONNECT_STATE_SECRET');

    if (!clientId || !redirectUri || !stateSecret) {
      console.error('stripe-connect-onboard: missing env vars');
      return json({ error: 'stripe connect not configured' }, 500);
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

    // Must be an admin in some org to connect Stripe on its behalf.
    const { data: roleRow } = await supabase
      .from('user_organization_roles')
      .select('organization_id, role')
      .eq('user_id', userRow.id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (!roleRow) return json({ error: 'must be an org admin to connect Stripe' }, 403);
    const organizationId = roleRow.organization_id as string;

    // If a connection already exists, surface that — frontend can show "reconnect" UI instead.
    const { data: existing } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id, status, charges_enabled, payouts_enabled')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const state = await signState(organizationId, stateSecret);

    const oauthUrl = new URL('https://connect.stripe.com/oauth/authorize');
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('client_id', clientId);
    oauthUrl.searchParams.set('scope', 'read_write');
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('state', state);
    // Pre-fill with the user's email so the Stripe form is one click instead of a form.
    if (authUser.user.email) {
      oauthUrl.searchParams.set('stripe_user[email]', authUser.user.email);
    }

    return json({ url: oauthUrl.toString(), existing: existing ?? null });
  } catch (e) {
    console.error('stripe-connect-onboard crashed', e);
    return json({ error: 'internal' }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Sign `${orgId}.${timestamp}` with HMAC-SHA256 so the callback can verify the state
// wasn't tampered with and is fresh (< 15 min old).
async function signState(orgId: string, secret: string): Promise<string> {
  const payload = `${orgId}.${Date.now()}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  // base64-url-safe so it doesn't break URL encoding
  const sigUrlSafe = sigB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payloadB64 = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${payloadB64}.${sigUrlSafe}`;
}

// Exported for the callback to import — see stripe-connect-callback/index.ts.
// (Inlined here for now; can be moved to _shared/stripe-state.ts if a third caller appears.)
export async function verifyState(state: string, secret: string): Promise<{ ok: true; orgId: string } | { ok: false; reason: string }> {
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
