/**
 * Rate Limiting Utilities
 * Implements token bucket algorithm with X-RateLimit headers
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  headers: HeadersInit;
}

// In-memory rate limit store (survives within same function invocation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for request
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { maxRequests, windowMs, identifier } = config;
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  // Get or create bucket
  let bucket = rateLimitStore.get(key);
  
  if (!bucket || now >= bucket.resetTime) {
    // Create new bucket
    bucket = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, bucket);
  }

  // Check if allowed
  const allowed = bucket.count < maxRequests;
  
  if (allowed) {
    bucket.count++;
  }

  const remaining = Math.max(0, maxRequests - bucket.count);
  const resetTime = bucket.resetTime;
  const retryAfter = Math.ceil((resetTime - now) / 1000);

  // Cleanup old entries (keep memory usage low)
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now >= v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  return {
    allowed,
    remaining,
    resetTime,
    headers: {
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.floor(resetTime / 1000).toString(),
      ...(allowed ? {} : { 'Retry-After': retryAfter.toString() }),
    },
  };
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
 * Get identifier from request (IP, auth, etc.)
 */
export function getRequestIdentifier(req: Request): string {
  // Try to get auth user
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    return `auth:${authHeader.slice(0, 20)}`; // Use first 20 chars as ID
  }

  // Fall back to IP (if available)
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') ||
             'unknown';
  
  return `ip:${ip}`;
}
