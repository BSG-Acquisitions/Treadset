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
 * V1 scope: one static tool (get_current_time) just to prove the
 * tool-use loop works end-to-end. The real read tools
 * (search_clients, get_pickups, highlight_ui, navigate_to,
 * escalate_to_human) land in week 2.
 *
 * To add a new tool:
 *   1. Add it to the object returned by buildToolFactory
 *   2. Use closure variables (organizationId etc) inside execute
 *   3. NEVER let the model pass an org_id as a parameter
 *   4. Always validate inputs with zod
 */
import { tool } from 'npm:ai@^6.0.0';
import { z } from 'npm:zod@^3.25.76';

interface ToolContext {
  organizationId: string;
  userId: string;
  userRole: string;
  supabaseClient: any; // SupabaseClient — kept loose for V1 skeleton
}

export function buildToolFactory(ctx: ToolContext) {
  return {
    /**
     * V1 proof-of-loop tool. Returns the current server time + user's
     * tenant id. Used to verify the tool-use loop works end-to-end
     * without touching any tenant data.
     *
     * Will be removed in V2 when the real tools land.
     */
    get_current_time: tool({
      description:
        'Returns the current server time and the tenant context the user is currently scoped to. Use this only if the user explicitly asks what time it is or which tenant they are in. Do not call this on every turn.',
      inputSchema: z.object({}),
      execute: async () => {
        return {
          server_time_iso: new Date().toISOString(),
          tenant_organization_id: ctx.organizationId,
          your_role: ctx.userRole,
          your_user_id: ctx.userId,
          tready_version: 'V1.0.0-scaffold',
        };
      },
    }),
  };
}
