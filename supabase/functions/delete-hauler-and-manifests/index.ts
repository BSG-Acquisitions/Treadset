import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env vars');

    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const { haulerId, email } = body as { haulerId?: string; email?: string };

    if (!haulerId && !email) {
      return new Response(JSON.stringify({ error: 'Provide haulerId or email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve hauler id if only email provided
    let targetHaulerId = haulerId ?? null;
    if (!targetHaulerId && email) {
      const { data: haulerRow, error: findErr } = await supabase
        .from('haulers')
        .select('id, email, company_name, hauler_name')
        .eq('email', email)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!haulerRow) {
        return new Response(JSON.stringify({ error: 'Hauler not found for email' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      targetHaulerId = haulerRow.id as string;
    }

    if (!targetHaulerId) {
      return new Response(JSON.stringify({ error: 'Unable to resolve hauler id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Deleting manifests for hauler:', targetHaulerId);

    // Best-effort cleanup of dependent records that may reference the hauler
    // 1) Delete manifests for this hauler
    const { error: delManifestsErr } = await supabase
      .from('manifests')
      .delete()
      .eq('hauler_id', targetHaulerId);
    if (delManifestsErr) throw delManifestsErr;

    // 2) Optional: clear assignments with this hauler (if any)
    await supabase.from('assignments').delete().eq('hauler_id', targetHaulerId);

    // 3) Now delete the hauler
    const { error: delHaulerErr } = await supabase
      .from('haulers')
      .delete()
      .eq('id', targetHaulerId);
    if (delHaulerErr) throw delHaulerErr;

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('delete-hauler-and-manifests error:', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unknown error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
