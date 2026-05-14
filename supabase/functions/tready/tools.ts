/**
 * Tready tool factory.
 *
 * EVERY tool is constructed PER-REQUEST and closes over the
 * organization_id, user_id, and user_role derived from the user's JWT.
 * The model CANNOT override these values — they're not parameters,
 * they're closure scope.
 *
 * This is the multi-tenant safety pattern enforced by brief §3.
 *
 * Build 2 scope: 1 proof tool + 5 real read tools. All are read-only
 * and tenant-scoped. Write tools (schedule_pickup, void_manifest, etc.)
 * land in Build 6 with a confirmation step.
 *
 * To add a new tool:
 *   1. Add it to the object returned by buildToolFactory
 *   2. Use closure variables (organizationId etc) inside execute
 *   3. NEVER let the model pass an org_id as a parameter
 *   4. Always validate inputs with zod
 *   5. Return small, model-friendly JSON (avoid raw DB rows)
 */
import { tool } from 'npm:ai@^6.0.0';
import { z } from 'npm:zod@^3.25.76';

interface ToolContext {
  organizationId: string;
  userId: string;
  userRole: string;
  supabaseClient: any;
}

export function buildToolFactory(ctx: ToolContext) {
  return {
    /**
     * Proof-of-loop tool from V1. Kept for sanity-check + diagnostics.
     */
    get_current_time: tool({
      description:
        'Returns the current server time and tenant context. Use only if the user explicitly asks what time or which tenant they\'re in — not on every turn.',
      inputSchema: z.object({}),
      execute: async () => ({
        server_time_iso: new Date().toISOString(),
        tenant_organization_id: ctx.organizationId,
        your_role: ctx.userRole,
        tready_version: 'V1.1.0-build-2',
      }),
    }),

    /**
     * High-level dashboard numbers for THIS tenant. Use when the user
     * asks "how busy are we?" / "how many pickups today" / "today's stats".
     */
    get_dashboard_stats: tool({
      description:
        'Returns today\'s headline numbers for the current tenant: today\'s scheduled pickups count, today\'s completed pickups count, today\'s PTE total, this-week pickup count, active client count, and pending-manifest count. Use this when the user asks about overall activity, today\'s numbers, or recent volume.',
      inputSchema: z.object({}),
      execute: async () => {
        const today = new Date().toISOString().slice(0, 10);
        const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

        const [todayPickups, weekPickups, activeClients, pendingManifests] = await Promise.all([
          ctx.supabaseClient
            .from('pickups')
            .select('id, status, pte_count', { count: 'exact' })
            .eq('organization_id', ctx.organizationId)
            .eq('pickup_date', today),
          ctx.supabaseClient
            .from('pickups')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', ctx.organizationId)
            .gte('pickup_date', sevenDaysAgo),
          ctx.supabaseClient
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', ctx.organizationId)
            .eq('is_active', true),
          ctx.supabaseClient
            .from('manifests')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', ctx.organizationId)
            .in('status', ['DRAFT', 'IN_PROGRESS', 'AWAITING_SIGNATURE', 'AWAITING_RECEIVER_SIGNATURE']),
        ]);

        const todayRows = (todayPickups.data ?? []) as Array<{ status?: string; pte_count?: number | null }>;
        const todayCompleted = todayRows.filter((r) => r.status === 'completed').length;
        const todayPte = todayRows.reduce((sum, r) => sum + (r.pte_count ?? 0), 0);

        return {
          today_date: today,
          today_pickups_total: todayPickups.count ?? 0,
          today_pickups_completed: todayCompleted,
          today_pte_total: todayPte,
          week_pickups_total: weekPickups.count ?? 0,
          active_clients_total: activeClients.count ?? 0,
          pending_manifests_total: pendingManifests.count ?? 0,
        };
      },
    }),

    /**
     * Recent pickups list, scoped to the tenant. Use when the user wants
     * to see what's been happening lately, or asks "show me my pickups."
     */
    list_recent_pickups: tool({
      description:
        'Returns the most recent pickups for the current tenant, grouped from newest to oldest. Use when the user wants to see recent activity, scan today\'s work, or review what was completed.',
      inputSchema: z.object({
        days_back: z.number().int().min(1).max(90).default(7).describe('How far back to look (default 7).'),
        limit: z.number().int().min(1).max(50).default(10).describe('Max rows to return (default 10).'),
      }),
      execute: async ({ days_back, limit }) => {
        const since = new Date(Date.now() - days_back * 86_400_000).toISOString().slice(0, 10);
        const { data, error } = await ctx.supabaseClient
          .from('pickups')
          .select('id, pickup_date, pte_count, otr_count, tractor_count, status, payment_status, computed_revenue, client_id, clients(company_name)')
          .eq('organization_id', ctx.organizationId)
          .gte('pickup_date', since)
          .order('pickup_date', { ascending: false })
          .limit(limit);

        if (error) {
          return { error: error.message };
        }

        return {
          days_back,
          count: data?.length ?? 0,
          pickups: (data ?? []).map((p: any) => ({
            id: p.id,
            date: p.pickup_date,
            client: p.clients?.company_name ?? 'unknown',
            pte: p.pte_count ?? 0,
            otr: p.otr_count ?? 0,
            tractor: p.tractor_count ?? 0,
            status: p.status,
            payment: p.payment_status,
            revenue: p.computed_revenue,
          })),
        };
      },
    }),

    /**
     * Search clients by company name (or city). Tenant-scoped.
     */
    search_clients: tool({
      description:
        'Searches the current tenant\'s clients by name. Returns matching clients with basic info. Use when the user names a client or asks to find one.',
      inputSchema: z.object({
        query: z.string().min(1).max(100).describe('The text to search for in company name or city. Case-insensitive substring match.'),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ query, limit }) => {
        const { data, error } = await ctx.supabaseClient
          .from('clients')
          .select('id, company_name, contact_name, email, phone, physical_city, physical_state, lifetime_revenue, last_pickup_at, is_active')
          .eq('organization_id', ctx.organizationId)
          .or(`company_name.ilike.%${query}%,physical_city.ilike.%${query}%`)
          .limit(limit);

        if (error) {
          return { error: error.message };
        }
        return {
          query,
          count: data?.length ?? 0,
          clients: data ?? [],
        };
      },
    }),

    /**
     * Manifests waiting on signature or otherwise pending. Helps the
     * user clear their inbox of incomplete manifests.
     */
    list_pending_manifests: tool({
      description:
        'Lists manifests that are NOT yet COMPLETED or VOIDED — i.e., still in DRAFT, IN_PROGRESS, AWAITING_SIGNATURE, or AWAITING_RECEIVER_SIGNATURE. Use when the user asks what\'s pending, what needs signature, or what\'s open.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async ({ limit }) => {
        const { data, error } = await ctx.supabaseClient
          .from('manifests')
          .select('id, manifest_number, status, total_pte, otr_count, tractor_count, created_at, client_id, clients(company_name)')
          .eq('organization_id', ctx.organizationId)
          .in('status', ['DRAFT', 'IN_PROGRESS', 'AWAITING_SIGNATURE', 'AWAITING_RECEIVER_SIGNATURE'])
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          return { error: error.message };
        }
        return {
          count: data?.length ?? 0,
          manifests: (data ?? []).map((m: any) => ({
            id: m.id,
            manifest_number: m.manifest_number,
            client: m.clients?.company_name ?? 'unknown',
            status: m.status,
            total_pte: m.total_pte,
            otr: m.otr_count ?? 0,
            tractor: m.tractor_count ?? 0,
            created_at: m.created_at,
          })),
        };
      },
    }),

    /**
     * Manifest detail by ID. For when the user is looking at a specific
     * manifest or asks "what's the status of manifest X."
     */
    get_manifest_summary: tool({
      description:
        'Returns details about a single manifest: status, tire counts, signatures, payment, and linked pickup. Use when the user references a specific manifest by ID or number.',
      inputSchema: z.object({
        manifest_id_or_number: z.string().min(1).describe('Either the manifest UUID or the human-readable manifest_number.'),
      }),
      execute: async ({ manifest_id_or_number }) => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(manifest_id_or_number);
        const query = ctx.supabaseClient
          .from('manifests')
          .select('id, manifest_number, status, payment_status, payment_method, direction, total_pte, pte_off_rim, pte_on_rim, otr_count, tractor_count, semi_count, gross_weight_lbs, net_weight_lbs, generator_signed_at, hauler_signed_at, receiver_signed_at, email_sent_at, created_at, client_id, clients(company_name), driver_name')
          .eq('organization_id', ctx.organizationId)
          .limit(1);

        const filtered = isUuid
          ? query.eq('id', manifest_id_or_number)
          : query.eq('manifest_number', manifest_id_or_number);

        const { data, error } = await filtered.maybeSingle();
        if (error) {
          return { error: error.message };
        }
        if (!data) {
          return { found: false, hint: 'No manifest matched. Check the ID or number, or ask the user to specify which client it\'s for.' };
        }
        return { found: true, manifest: data };
      },
    }),
  };
}
