/**
 * Server-Side Role Enforcement Utilities
 * PR#6: Add robust role checking for sensitive operations
 */

import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'ops_manager' | 'dispatcher' | 'driver' | 'sales' | 'client' | 'receptionist';

export interface RoleCheckResult {
  authorized: boolean;
  userRoles: AppRole[];
  userId?: string;
  organizationId?: string;
  error?: string;
}

/**
 * Server-side role requirement with detailed logging
 * Use this at the top of all sensitive operations
 */
export async function requireRole(
  requiredRoles: AppRole | AppRole[],
  operation: string
): Promise<RoleCheckResult> {
  const startTime = Date.now();
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  console.log(`[ROLE_CHECK] ${operation}: Checking for roles [${roles.join(', ')}]`);

  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.warn(`[ROLE_CHECK] ${operation}: No valid session`, { sessionError });
      return {
        authorized: false,
        userRoles: [],
        error: 'AUTHENTICATION_REQUIRED'
      };
    }

    // Get user roles from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        user_organization_roles!inner (
          role,
          organization:organizations!inner (
            id,
            slug
          )
        )
      `)
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (userError) {
      console.error(`[ROLE_CHECK] ${operation}: Database error`, { userError });
      return {
        authorized: false,
        userRoles: [],
        error: 'DATABASE_ERROR'
      };
    }

    if (!userData) {
      console.warn(`[ROLE_CHECK] ${operation}: User not found in database`, { authUserId: session.user.id });
      return {
        authorized: false,
        userRoles: [],
        error: 'USER_NOT_FOUND'
      };
    }

    // Extract user roles for current organization (assuming BSG for now)
    const userRoles = userData.user_organization_roles
      ?.filter((uor: any) => uor.organization?.slug === 'bsg')
      ?.map((uor: any) => uor.role) || [];

    const organizationId = userData.user_organization_roles?.[0]?.organization?.id;

    // Check if user has any of the required roles
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    const elapsedMs = Date.now() - startTime;
    
    if (hasRequiredRole) {
      console.log(`[ROLE_CHECK] ${operation}: AUTHORIZED`, {
        userId: userData.id,
        userRoles,
        requiredRoles: roles,
        elapsedMs
      });
      
      return {
        authorized: true,
        userRoles,
        userId: userData.id,
        organizationId
      };
    } else {
      console.warn(`[ROLE_CHECK] ${operation}: UNAUTHORIZED`, {
        userId: userData.id,
        userRoles,
        requiredRoles: roles,
        elapsedMs
      });
      
      return {
        authorized: false,
        userRoles,
        userId: userData.id,
        organizationId,
        error: 'INSUFFICIENT_PRIVILEGES'
      };
    }

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[ROLE_CHECK] ${operation}: Exception`, { error, elapsedMs });
    
    return {
      authorized: false,
      userRoles: [],
      error: 'ROLE_CHECK_FAILED'
    };
  }
}

/**
 * Middleware wrapper for role-protected functions
 */
export function withRoleProtection<T extends any[], R>(
  requiredRoles: AppRole | AppRole[],
  operation: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const roleCheck = await requireRole(requiredRoles, operation);
    
    if (!roleCheck.authorized) {
      const error = new Error(`Unauthorized: ${operation}`);
      (error as any).code = roleCheck.error;
      (error as any).userRoles = roleCheck.userRoles;
      throw error;
    }
    
    return fn(...args);
  };
}

/**
 * Client-side role check (for UI guards)
 */
export function hasRole(userRoles: AppRole[], requiredRoles: AppRole | AppRole[]): boolean {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.some(role => userRoles.includes(role));
}