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
import { tool } from 'npm:ai@^5.0.188';
import { z } from 'npm:zod@^3.25.76';

interface ToolContext {
  organizationId: string;
  userId: string;
  userRole: string;
  supabaseClient: any;
}

// Supabase Edge Functions provide an in-runtime embedding model
// (https://supabase.com/docs/guides/functions/ai-models). gte-small
// returns 384-dim vectors. Lazy-init so the model is only downloaded
// once per cold-start (it's ~30MB).
let _embedSession: any = null;
async function embed(text: string): Promise<number[]> {
  // @ts-ignore — Supabase global only exists in Edge Function runtime
  if (!_embedSession) _embedSession = new Supabase.ai.Session('gte-small');
  return await _embedSession.run(text, { mean_pool: true, normalize: true }) as number[];
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
        tready_version: 'V1.2.0-build-6',
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
     * Navigate the user to a different page in TreadSet. The frontend
     * listens for this tool's output and calls react-router's navigate().
     * Use BEFORE highlight_ui when the target element lives on a page
     * the user isn't currently on.
     *
     * Typical pattern:
     *   navigate_to('/clients') → highlight_ui('clients-add-button')
     */
    navigate_to: tool({
      description:
        'Navigates the user to a different page in TreadSet via react-router (no full reload). Use BEFORE highlight_ui when the element you want lives on a different page. Common paths: /dashboard, /clients, /manifests, /routes/today, /settings, /integrations, /reports/compliance, /driver/dashboard.',
      inputSchema: z.object({
        path: z.string().min(1).max(120).describe('The route path to navigate to (e.g., "/clients").'),
        reason: z.string().min(2).max(140).optional().describe('Optional one-sentence "why" shown briefly to the user.'),
      }),
      execute: async ({ path, reason }) => {
        return {
          navigated_to: path,
          reason: reason ?? null,
        };
      },
    }),

    /**
     * Visually highlight a UI element on the user's screen with a
     * pulsing ring + optional caption. The frontend HighlightOverlay
     * component (week 2 deliverable) listens for this tool's output
     * via the SSE stream and renders the highlight.
     *
     * This tool ONLY returns structured data — it does not directly
     * touch the DOM. The model uses it to instruct the frontend to
     * point at a real on-screen element.
     *
     * Validates against tready_ui_map so the model cannot invent
     * element_ids. If the element doesn't exist or the user's role
     * doesn't qualify, returns a hint so Tready can fall back to a
     * verbal description.
     */
    highlight_ui: tool({
      description:
        'Visually highlights an element on the user\'s screen (pulsing ring + caption). Use ANY time you tell the user where to click. The frontend renders the highlight based on what you return. ALWAYS use exact element_ids from the UI map. Don\'t invent IDs. If the element you want isn\'t in the map, fall back to describing the location in plain English instead of calling this tool.',
      inputSchema: z.object({
        element_id: z.string().min(2).max(80).describe('The exact data-tready-id from the UI map. e.g., "clients-add-button".'),
        caption: z.string().min(2).max(140).optional().describe('Optional short label (≤140 chars) shown next to the ring. e.g., "Click here to add a client."'),
        wait_for_click: z.boolean().default(false).describe('If true, the frontend waits for the user to click before letting Tready continue. Use for multi-step walkthroughs.'),
      }),
      execute: async ({ element_id, caption, wait_for_click }) => {
        const { data, error } = await ctx.supabaseClient
          .from('tready_ui_map')
          .select('element_id, label, page_path, location_hint, required_roles, required_app_state, is_active')
          .eq('element_id', element_id)
          .eq('is_active', true)
          .maybeSingle();

        if (error || !data) {
          return {
            highlighted: false,
            error: 'element_not_in_ui_map',
            element_id,
            hint: `No element registered as "${element_id}" in tready_ui_map. Describe its location verbally instead of calling this tool.`,
          };
        }

        // Role gate — make sure this element is accessible to the user
        const requiredRoles: string[] = data.required_roles ?? [];
        if (requiredRoles.length > 0 && !requiredRoles.includes(ctx.userRole)) {
          return {
            highlighted: false,
            error: 'role_not_permitted',
            element_id,
            element_label: data.label,
            user_role: ctx.userRole,
            required_roles: requiredRoles,
            hint: `This element is only visible to ${requiredRoles.join('/')}. The current user is ${ctx.userRole}. Tell them honestly that this isn\'t available to their role.`,
          };
        }

        return {
          highlighted: true,
          element_id: data.element_id,
          element_label: data.label,
          page_path: data.page_path,
          location_hint: data.location_hint,
          caption: caption ?? data.label,
          wait_for_click,
          // The frontend reads this payload from the tool-output SSE event.
        };
      },
    }),

    /**
     * RAG search over the Tready knowledge base. Tready calls this
     * when a user asks something that's not directly answerable from
     * persona / live data tools — Z's curated Q&A pairs (and later,
     * industry / state-compliance facts) live here.
     *
     * Returns matches scored by cosine similarity. Org-scoped:
     * matches either GLOBAL entries (organization_id IS NULL) OR
     * the caller's tenant entries.
     */
    search_kb: tool({
      description:
        'Searches Tready\'s knowledge base for relevant facts about TreadSet, tire-recycling operations, compliance, or this tenant\'s specific notes. Use when the user asks something that requires specific knowledge (a regulation, a how-to that\'s not obvious from the UI map, a tenant-specific fact). Returns up to 5 matches with relevance scores. If results are weak (similarity < 0.5), fall back to "I don\'t know — let me get this to a human."',
      inputSchema: z.object({
        query: z.string().min(3).max(500).describe('A focused natural-language query. Concrete > abstract.'),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ query, limit }) => {
        try {
          const queryEmbedding = await embed(query);

          // Use rpc if available, otherwise use direct query with vector ops.
          // The vector operator <=> returns cosine distance (lower = closer).
          // We compute similarity = 1 - distance for the model's intuition.
          const { data, error } = await ctx.supabaseClient.rpc('match_tready_kb', {
            query_embedding: queryEmbedding,
            match_org_id: ctx.organizationId,
            match_count: limit,
          });

          if (error) {
            // RPC may not exist yet — fall back to direct similarity query
            const directQuery = await ctx.supabaseClient
              .from('tready_kb')
              .select('id, topic, content, source, confidence, organization_id')
              .or(`organization_id.is.null,organization_id.eq.${ctx.organizationId}`)
              .limit(limit);

            return {
              query,
              note: 'RAG fallback used (no vector match RPC available; returning recent KB entries instead). Build the match_tready_kb RPC to enable real similarity ranking.',
              matches: directQuery.data ?? [],
              error_if_any: error.message,
            };
          }

          return {
            query,
            count: data?.length ?? 0,
            matches: data ?? [],
          };
        } catch (e) {
          return { error: (e as Error).message, hint: 'Embedding generation may have failed. Tell the user "I don\'t have a good answer for that yet" and offer to escalate.' };
        }
      },
    }),

    /**
     * Admin-only: add a new Q&A entry to the knowledge base. This is
     * the foundation of the V3 curator loop — Z teaches Tready once,
     * forever. The frontend "Teach Tready" button (Build 3 frontend)
     * calls this; the V3 curator job auto-calls this with proposed
     * drafts derived from escalation patterns.
     *
     * Refuses to run unless the caller has admin or super_admin role.
     * Embeddings generated server-side via Supabase.ai.Session.
     */
    teach_tready: tool({
      description:
        'Add a new fact / Q&A pair to Tready\'s knowledge base so future questions on the same topic get answered automatically. ADMIN ONLY — refuses if the calling user is not an admin or super_admin. Use ONLY when the user explicitly asks Tready to remember something or learn a new fact. Otherwise leave the KB to the curator.',
      inputSchema: z.object({
        topic: z.string().min(3).max(200).describe('A short topic label (e.g., "voiding manifests", "Texas TCEQ retention").'),
        content: z.string().min(10).max(2000).describe('The actual fact / answer / Q&A in plain English. Will be embedded as-is for similarity search.'),
        scope: z.enum(['tenant', 'global']).default('tenant').describe('"tenant" = visible only to this organization. "global" = visible to all tenants. Default tenant; super_admin can use global.'),
      }),
      execute: async ({ topic, content, scope }) => {
        // Role gate — only admins teach Tready
        if (ctx.userRole !== 'admin' && ctx.userRole !== 'super_admin') {
          return {
            success: false,
            error: 'role_not_permitted',
            message: 'Only admins can teach Tready new facts. Tell the user this and offer to escalate to an admin if needed.',
          };
        }

        // Global scope requires super_admin
        if (scope === 'global' && ctx.userRole !== 'super_admin') {
          return {
            success: false,
            error: 'scope_not_permitted',
            message: 'Global KB scope is super_admin only. Falling back to tenant scope would be safer.',
          };
        }

        try {
          const embedding = await embed(`${topic}\n\n${content}`);
          const { data, error } = await ctx.supabaseClient
            .from('tready_kb')
            .insert({
              organization_id: scope === 'global' ? null : ctx.organizationId,
              topic,
              content,
              embedding,
              source: 'z_authored',
              confidence: 1.0,
            })
            .select('id, topic')
            .single();

          if (error) {
            return { success: false, error: error.message };
          }
          return { success: true, kb_id: data.id, topic: data.topic, scope };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
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

    // ------------------------------------------------------------------------
    // Build 6 — write tools.
    // Two-step preview/confirm protocol: every write tool takes a `confirm`
    // boolean. Call with `confirm: false` first → tool returns a preview of
    // what it WOULD do. Show the preview to the user, get verbal "yes",
    // then call again with `confirm: true` to actually write.
    // The model must NEVER call confirm: true on the first turn.
    // ------------------------------------------------------------------------

    /**
     * Lists drivers in the caller's org. Helper for assign_driver_to_pickup
     * — when the user says "assign Bob to pickup X," Tready needs Bob's
     * users.id to write the assignment. Returns name + email + id + active
     * status. Tenant-scoped via org_id closure.
     */
    list_drivers: tool({
      description:
        'Lists drivers in the current tenant (users with role driver). Use BEFORE assign_driver_to_pickup so the model can map a driver name to a users.id. Use also when the user asks who is driving today / lists drivers / asks who is available.',
      inputSchema: z.object({
        query: z.string().min(1).max(100).optional().describe('Optional substring match against first_name, last_name, or email. Case-insensitive.'),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ query, limit }) => {
        let q = ctx.supabaseClient
          .from('user_organization_roles')
          .select('user_id, role, users!inner(id, first_name, last_name, email)')
          .eq('organization_id', ctx.organizationId)
          .eq('role', 'driver')
          .limit(limit);

        const { data, error } = await q;
        if (error) {
          return { error: error.message };
        }

        let drivers = (data ?? []).map((r: any) => ({
          users_id: r.users.id,
          first_name: r.users.first_name,
          last_name: r.users.last_name,
          email: r.users.email,
        }));

        if (query) {
          const needle = query.toLowerCase();
          drivers = drivers.filter(
            (d) =>
              (d.first_name ?? '').toLowerCase().includes(needle) ||
              (d.last_name ?? '').toLowerCase().includes(needle) ||
              (d.email ?? '').toLowerCase().includes(needle),
          );
        }

        return {
          query: query ?? null,
          count: drivers.length,
          drivers,
        };
      },
    }),

    /**
     * Schedules a pickup for a client. Two-step protocol:
     *   - confirm: false  →  return preview, do not write
     *   - confirm: true   →  insert the pickup row, return id + summary
     *
     * Tenant-safe: verifies client_id and optional location_id both belong
     * to the caller's org before any write. tire counts are NOT taken here
     * — they're filled in by the driver at pickup completion. The status
     * field defaults to 'scheduled'.
     *
     * Compliance scope: the row this creates will eventually become a
     * manifest. The tool does NOT set anything that appears on the manifest
     * (counts, weights, signatures) — those come later. So the engineering
     * write here is upstream of regulated paperwork, not OF it.
     */
    schedule_pickup: tool({
      description:
        'Schedules a new pickup for a client. ALWAYS call this with confirm: false first to preview; show the preview to the user; only call with confirm: true after the user explicitly says yes. Sets status=scheduled. Does NOT set tire counts (those come from the driver at completion).',
      inputSchema: z.object({
        client_id: z.string().uuid().describe('The clients.id of the tire-generating business. Resolve via search_clients first if the user gives a name.'),
        pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Pickup date in YYYY-MM-DD format.'),
        location_id: z.string().uuid().optional().describe('Optional locations.id. If omitted, the pickup has no specific location (some tenants do this).'),
        notes: z.string().max(500).optional().describe('Optional dispatcher note about the pickup.'),
        confirm: z.boolean().describe('false = preview only (default first call). true = actually write the pickup. NEVER pass true on the first call — show the preview to the user and wait for verbal confirmation first.'),
      }),
      execute: async ({ client_id, pickup_date, location_id, notes, confirm }) => {
        // Verify client belongs to caller's org
        const { data: client, error: clientErr } = await ctx.supabaseClient
          .from('clients')
          .select('id, company_name, organization_id, is_active')
          .eq('id', client_id)
          .eq('organization_id', ctx.organizationId)
          .maybeSingle();

        if (clientErr) return { error: clientErr.message };
        if (!client) {
          return {
            error: 'client_not_found',
            hint: 'No client with that id in your organization. Use search_clients to find the right client_id.',
          };
        }
        if (client.is_active === false) {
          return {
            error: 'client_inactive',
            hint: `Client "${client.company_name}" is marked inactive. Confirm with the user whether to reactivate before scheduling.`,
          };
        }

        // Verify location if provided
        let locationLabel: string | null = null;
        if (location_id) {
          const { data: loc, error: locErr } = await ctx.supabaseClient
            .from('locations')
            .select('id, name, address, organization_id, client_id')
            .eq('id', location_id)
            .eq('organization_id', ctx.organizationId)
            .maybeSingle();

          if (locErr) return { error: locErr.message };
          if (!loc) {
            return {
              error: 'location_not_found',
              hint: 'No location with that id in your organization.',
            };
          }
          if (loc.client_id !== client_id) {
            return {
              error: 'location_client_mismatch',
              hint: `Location ${loc.name ?? loc.address} does not belong to ${client.company_name}.`,
            };
          }
          locationLabel = loc.name ?? loc.address ?? null;
        }

        const preview = {
          action: 'schedule_pickup',
          client: { id: client.id, name: client.company_name },
          location: location_id ? { id: location_id, label: locationLabel } : null,
          pickup_date,
          notes: notes ?? null,
          status: 'scheduled',
        };

        if (!confirm) {
          return {
            written: false,
            preview,
            confirm_instruction:
              'Show this preview to the user. If they confirm verbally, call this tool again with the same args and confirm: true.',
          };
        }

        const { data: inserted, error: insertErr } = await ctx.supabaseClient
          .from('pickups')
          .insert({
            organization_id: ctx.organizationId,
            client_id,
            location_id: location_id ?? null,
            pickup_date,
            status: 'scheduled',
            notes: notes ?? null,
          })
          .select('id, pickup_date, status, client_id, location_id')
          .single();

        if (insertErr) return { written: false, error: insertErr.message };

        return {
          written: true,
          pickup: {
            id: inserted.id,
            client: client.company_name,
            pickup_date: inserted.pickup_date,
            status: inserted.status,
            location_label: locationLabel,
          },
          next_step_hint:
            'Tell the user the pickup is on the books. Offer to assign a driver via assign_driver_to_pickup.',
        };
      },
    }),

    /**
     * Assigns a driver (and optional vehicle) to an existing pickup by
     * creating an assignments row. Two-step protocol like schedule_pickup.
     *
     * Tenant-safe: verifies pickup, driver, and vehicle (if given) all
     * belong to the caller's org. The driver must have role=driver in
     * the same org. The vehicle, if provided, must belong to the org.
     */
    assign_driver_to_pickup: tool({
      description:
        'Assigns a driver to a pickup by creating an assignments row. ALWAYS call with confirm: false first to preview; only call with confirm: true after the user verbally confirms. Optionally set vehicle_id and scheduled_date (defaults to the pickup_date).',
      inputSchema: z.object({
        pickup_id: z.string().uuid().describe('The pickups.id to assign. Find it via list_recent_pickups or by asking the user.'),
        driver_user_id: z.string().uuid().describe('The users.id of the driver. Resolve via list_drivers first if the user gives a name.'),
        vehicle_id: z.string().uuid().optional().describe('Optional vehicles.id to assign alongside the driver.'),
        scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Optional YYYY-MM-DD scheduled_date. Defaults to the pickup_date if omitted.'),
        sequence_order: z.number().int().min(0).max(100).optional().describe('Optional route ordering. If omitted, the dispatcher will set sequence later.'),
        confirm: z.boolean().describe('false = preview only. true = write. NEVER true on the first call.'),
      }),
      execute: async ({ pickup_id, driver_user_id, vehicle_id, scheduled_date, sequence_order, confirm }) => {
        // Verify pickup belongs to caller's org
        const { data: pickup, error: pickupErr } = await ctx.supabaseClient
          .from('pickups')
          .select('id, pickup_date, status, organization_id, client_id, clients(company_name)')
          .eq('id', pickup_id)
          .eq('organization_id', ctx.organizationId)
          .maybeSingle();

        if (pickupErr) return { error: pickupErr.message };
        if (!pickup) {
          return {
            error: 'pickup_not_found',
            hint: 'No pickup with that id in your organization.',
          };
        }

        // Verify driver is a driver-role member of caller's org
        const { data: driverRole, error: driverErr } = await ctx.supabaseClient
          .from('user_organization_roles')
          .select('user_id, role, users!inner(id, first_name, last_name, email)')
          .eq('organization_id', ctx.organizationId)
          .eq('user_id', driver_user_id)
          .eq('role', 'driver')
          .maybeSingle();

        if (driverErr) return { error: driverErr.message };
        if (!driverRole) {
          return {
            error: 'driver_not_in_org',
            hint: 'That user is not a driver in your organization. Use list_drivers to find a valid driver.',
          };
        }
        const driverName = `${(driverRole as any).users.first_name ?? ''} ${(driverRole as any).users.last_name ?? ''}`.trim() || (driverRole as any).users.email;

        // Verify vehicle if provided
        let vehicleLabel: string | null = null;
        if (vehicle_id) {
          const { data: vehicle, error: vehicleErr } = await ctx.supabaseClient
            .from('vehicles')
            .select('id, name, license_plate, organization_id')
            .eq('id', vehicle_id)
            .eq('organization_id', ctx.organizationId)
            .maybeSingle();
          if (vehicleErr) return { error: vehicleErr.message };
          if (!vehicle) {
            return {
              error: 'vehicle_not_in_org',
              hint: 'That vehicle does not belong to your organization.',
            };
          }
          vehicleLabel = vehicle.name ?? vehicle.license_plate ?? null;
        }

        const effectiveDate = scheduled_date ?? pickup.pickup_date;

        const preview = {
          action: 'assign_driver_to_pickup',
          pickup: {
            id: pickup.id,
            client: (pickup as any).clients?.company_name ?? 'unknown',
            pickup_date: pickup.pickup_date,
          },
          driver: { id: driver_user_id, name: driverName },
          vehicle: vehicle_id ? { id: vehicle_id, label: vehicleLabel } : null,
          scheduled_date: effectiveDate,
          sequence_order: sequence_order ?? null,
          status: 'assigned',
        };

        if (!confirm) {
          return {
            written: false,
            preview,
            confirm_instruction:
              'Show this preview to the user. If they confirm verbally, call this tool again with the same args and confirm: true.',
          };
        }

        const { data: inserted, error: insertErr } = await ctx.supabaseClient
          .from('assignments')
          .insert({
            organization_id: ctx.organizationId,
            pickup_id,
            driver_id: driver_user_id,
            vehicle_id: vehicle_id ?? null,
            scheduled_date: effectiveDate,
            sequence_order: sequence_order ?? null,
            status: 'assigned',
          })
          .select('id, pickup_id, driver_id, vehicle_id, scheduled_date, status')
          .single();

        if (insertErr) return { written: false, error: insertErr.message };

        return {
          written: true,
          assignment: {
            id: inserted.id,
            pickup_id: inserted.pickup_id,
            driver_name: driverName,
            vehicle_label: vehicleLabel,
            scheduled_date: inserted.scheduled_date,
            status: inserted.status,
          },
        };
      },
    }),
  };
}
