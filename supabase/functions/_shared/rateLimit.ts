/**
 * Rate Limiting Utilities - Enhanced with Database Persistence
 * Implements server-side rate limiting with Supabase storage
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
  endpoint: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  headers: HeadersInit;
}

/**
 * Check rate limit using database persistence
 */
export async function checkRateLimit(
  config: RateLimitConfig,
  supabaseClient: ReturnType<typeof createClient>
): Promise<RateLimitResult> {
  const { maxRequests, windowMs, identifier, endpoint } = config;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    // Try to get existing rate limit record
    const { data: existing, error: fetchError } = await supabaseClient
      .from('rate_limits')
      .select('*')
      .eq('user_id', identifier)
      .eq('endpoint', endpoint)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Rate limit fetch error:', fetchError);
      // Allow on error to prevent blocking legitimate requests
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: resetAt.getTime(),
        headers: {
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': (maxRequests - 1).toString(),
          'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000).toString(),
        },
      };
    }

    // Check if window has expired
    const windowExpired = !existing || new Date(existing.reset_at) < now;

    if (windowExpired) {
      // Create or reset the rate limit record
      const { error: upsertError } = await supabaseClient
        .from('rate_limits')
        .upsert({
          user_id: identifier,
          endpoint,
          request_count: 1,
          reset_at: resetAt.toISOString(),
          updated_at: now.toISOString(),
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (upsertError) {
        console.error('Rate limit upsert error:', upsertError);
      }

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: resetAt.getTime(),
        headers: {
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': (maxRequests - 1).toString(),
          'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000).toString(),
        },
      };
    }

    // Window is still active, check if limit exceeded
    const allowed = existing.request_count < maxRequests;
    const remaining = Math.max(0, maxRequests - existing.request_count - 1);
    const existingResetTime = new Date(existing.reset_at).getTime();
    const retryAfter = Math.ceil((existingResetTime - now.getTime()) / 1000);

    if (allowed) {
      // Increment counter
      const { error: updateError } = await supabaseClient
        .from('rate_limits')
        .update({
          request_count: existing.request_count + 1,
          updated_at: now.toISOString(),
        })
        .eq('user_id', identifier)
        .eq('endpoint', endpoint);

      if (updateError) {
        console.error('Rate limit update error:', updateError);
      }
    }

    return {
      allowed,
      remaining,
      resetTime: existingResetTime,
      headers: {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.floor(existingResetTime / 1000).toString(),
        ...(allowed ? {} : { 'Retry-After': retryAfter.toString() }),
      },
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Allow on error to prevent blocking legitimate requests
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: resetAt.getTime(),
      headers: {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': (maxRequests - 1).toString(),
        'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000).toString(),
      },
    };
  }
}

/**
 * Create rate limited response
 */
export function createRateLimitResponse(
  remaining: number,
  resetTime: number
): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again after ${new Date(resetTime).toISOString()}`,
      remaining,
      resetTime,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.floor(resetTime / 1000).toString(),
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
      },
    }
  );
}

/**
 * Verify JWT token and extract user ID
 */
export async function verifyJWT(
  req: Request,
  supabaseClient: ReturnType<typeof createClient>
): Promise<{ userId: string; error?: string }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: '', error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      return { userId: '', error: 'Invalid or expired token' };
    }

    return { userId: user.id };
  } catch (error) {
    return { userId: '', error: 'Token verification failed' };
  }
}

/**
 * Get identifier from request for rate limiting
 */
export function getRequestIdentifier(req: Request, userId?: string): string {
  // Prefer authenticated user ID
  if (userId) {
    return userId;
  }

  // Fall back to IP (if available)
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') ||
             'unknown';
  
  return `ip:${ip}`;
}
