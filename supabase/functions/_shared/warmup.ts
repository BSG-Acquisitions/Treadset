/**
 * Function Warm-up Utilities
 * Pre-warms critical functions to reduce cold starts
 */

/**
 * Check if request is a warm-up ping
 */
export function isWarmupRequest(req: Request): boolean {
  return req.headers.get('x-warmup') === 'true' ||
         req.headers.get('user-agent')?.includes('warmup') ||
         false;
}

/**
 * Create warm-up response
 */
export function createWarmupResponse(): Response {
  return new Response(
    JSON.stringify({
      status: 'warm',
      timestamp: new Date().toISOString(),
      message: 'Function warmed up successfully',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Function-Status': 'warm',
      },
    }
  );
}

/**
 * Warm-up connection by executing lightweight query
 */
export async function warmupConnection(supabase: any): Promise<void> {
  try {
    // Execute lightweight query to establish connection
    await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle();
  } catch (error) {
    console.warn('Warmup connection failed:', error);
  }
}

/**
 * Pre-load critical data into memory
 */
export async function preloadCriticalData(supabase: any): Promise<void> {
  try {
    // Pre-load organization settings (commonly accessed)
    await supabase
      .from('organization_settings')
      .select('default_pte_rate, default_otr_rate, default_tractor_rate')
      .limit(1)
      .maybeSingle();
  } catch (error) {
    console.warn('Pre-load failed:', error);
  }
}
