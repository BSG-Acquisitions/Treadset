import {
  requireUserOrgAndRole,
  tenantAuthErrorResponse,
} from '../_shared/tenant-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Destructive endpoint: gate to admin / ops_manager. The function deletes
  // regulated manifest records, so we both validate JWT + scope to caller's
  // org + restrict to roles that have administrative responsibility.
  let supabase;
  let organizationId: string;
  try {
    const ctx = await requireUserOrgAndRole(req, ['admin', 'ops_manager']);
    supabase = ctx.supabaseService;
    organizationId = ctx.organizationId;
  } catch (err) {
    const r = tenantAuthErrorResponse(err, corsHeaders);
    if (r) return r;
    throw err;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { haulerId, email } = body as { haulerId?: string; email?: string };

    if (!haulerId && !email) {
      return new Response(JSON.stringify({ error: 'Provide haulerId or email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve hauler id if only email provided. Scoped to caller's org so
    // a caller in tenant A cannot delete a hauler belonging to tenant B.
    let targetHaulerId = haulerId ?? null;
    if (!targetHaulerId && email) {
      const { data: haulerRow, error: findErr } = await supabase
        .from('haulers')
        .select('id, email, company_name, hauler_name')
        .eq('email', email)
        .eq('organization_id', organizationId)
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

    // If haulerId came from body, verify it belongs to caller's org BEFORE
    // any destructive operation.
    {
      const { data: ownership, error: ownErr } = await supabase
        .from('haulers')
        .select('id')
        .eq('id', targetHaulerId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (ownErr) throw ownErr;
      if (!ownership) {
        return new Response(
          JSON.stringify({ error: 'Hauler not found in your organization' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    console.log('Deleting manifests for hauler:', targetHaulerId, 'org:', organizationId);

    // Best-effort cleanup of dependent records that may reference the hauler.
    // Every delete/update below is org-scoped — a malformed hauler_id with a
    // mismatched organization_id would already have been rejected above, but
    // we still belt-and-suspender the cascade.

    // 1) Get manifest IDs for this hauler within the caller's org
    const { data: manifestsData } = await supabase
      .from('manifests')
      .select('id')
      .eq('hauler_id', targetHaulerId)
      .eq('organization_id', organizationId);

    const manifestIds = manifestsData?.map(m => m.id) || [];

    // 2) Nullify pickups that reference these manifests (org-scoped)
    if (manifestIds.length > 0) {
      await supabase
        .from('pickups')
        .update({ manifest_id: null })
        .in('manifest_id', manifestIds)
        .eq('organization_id', organizationId);
    }

    // 3) Delete manifests for this hauler in the caller's org
    const { error: delManifestsErr } = await supabase
      .from('manifests')
      .delete()
      .eq('hauler_id', targetHaulerId)
      .eq('organization_id', organizationId);
    if (delManifestsErr) throw delManifestsErr;

    // 4) Clear assignments with this hauler in the caller's org
    await supabase
      .from('assignments')
      .delete()
      .eq('hauler_id', targetHaulerId)
      .eq('organization_id', organizationId);

    // 5) Delete the hauler itself (still org-scoped)
    const { error: delHaulerErr } = await supabase
      .from('haulers')
      .delete()
      .eq('id', targetHaulerId)
      .eq('organization_id', organizationId);
    if (delHaulerErr) throw delHaulerErr;

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('delete-hauler-and-manifests error:', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unknown error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
