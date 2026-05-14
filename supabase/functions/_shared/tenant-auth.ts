/**
 * Shared tenant-auth helper for Treadset edge functions.
 *
 * Mirrors the auth flow in supabase/functions/tready/index.ts:80-112:
 *   1. Validate the caller's Supabase user JWT.
 *   2. Resolve public.users.id and the user's first user_organization_roles
 *      row server-side. Never trust an organization_id from the request body.
 *   3. Return everything a tenant-scoped handler needs.
 *
 * Throws TenantAuthError on any failure; the caller converts it to a
 * Response via tenantAuthErrorResponse() so each function keeps its own
 * CORS headers + response shape.
 *
 * IMPORTANT: this requires the caller to attach a USER JWT (the supabase-js
 * client does this automatically for authenticated frontend callers). Cron
 * jobs that call functions with service_role only will NOT pass this check.
 * If a cron caller breaks after deploying a patch that uses this helper,
 * the cron path needs its own auth strategy (separate function, shared
 * secret header, etc.). See REVIEWS/TENANT_ISOLATION_AUDIT.md §8.
 */
import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.55.0';

export class TenantAuthError extends Error {
  constructor(
    public status: number,
    public errorCode: string,
    message?: string,
  ) {
    super(message || errorCode);
    this.name = 'TenantAuthError';
  }
}

export interface TenantContext {
  user: { id: string; email?: string };
  userId: string;          // public.users.id
  organizationId: string;
  role: string;
  supabaseService: SupabaseClient;
}

export async function requireUserAndOrg(req: Request): Promise<TenantContext> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new TenantAuthError(500, 'server_misconfigured', 'Missing Supabase env vars');
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new TenantAuthError(401, 'unauthorized', 'Missing Authorization header');
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    throw new TenantAuthError(401, 'invalid_token', authError?.message);
  }

  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  const { data: userRow, error: userError } = await supabaseService
    .from('users')
    .select('id, user_organization_roles!inner(organization_id, role)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (userError || !userRow || !(userRow as any).user_organization_roles?.length) {
    throw new TenantAuthError(403, 'user_not_in_any_org', userError?.message);
  }

  const firstRole = (userRow as any).user_organization_roles[0];
  return {
    user: { id: user.id, email: user.email },
    userId: (userRow as any).id,
    organizationId: firstRole.organization_id,
    role: firstRole.role,
    supabaseService,
  };
}

export async function requireUserOrgAndRole(
  req: Request,
  allowedRoles: string[],
): Promise<TenantContext> {
  const ctx = await requireUserAndOrg(req);
  if (!allowedRoles.includes(ctx.role)) {
    throw new TenantAuthError(
      403,
      'insufficient_role',
      `Required one of: ${allowedRoles.join(', ')}. Caller has: ${ctx.role}`,
    );
  }
  return ctx;
}

export function tenantAuthErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>,
): Response | null {
  if (err instanceof TenantAuthError) {
    return new Response(
      JSON.stringify({ error: err.errorCode, details: err.message }),
      {
        status: err.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
  return null;
}
