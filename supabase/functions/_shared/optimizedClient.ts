/**
 * Optimized Supabase Client with Connection Pooling
 * Reduces cold-start delays by reusing connections
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.4';

// Connection pool to reuse across invocations
let clientPool: SupabaseClient | null = null;
let lastUsed = Date.now();
const POOL_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get or create optimized Supabase client with connection pooling
 */
export function getOptimizedClient(): SupabaseClient {
  const now = Date.now();
  
  // Reuse existing client if still fresh
  if (clientPool && (now - lastUsed) < POOL_TTL) {
    lastUsed = now;
    return clientPool;
  }

  // Create new client with optimized settings
  clientPool = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-connection-pool': 'enabled',
        },
      },
    }
  );

  lastUsed = now;
  return clientPool;
}

/**
 * Get anon key client for public endpoints
 */
export function getAnonClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
