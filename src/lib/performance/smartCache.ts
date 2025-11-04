/**
 * Smart Caching Layer for Intelligence Modules
 * Provides automatic caching with invalidation for expensive queries
 * 
 * Note: Uses direct RPC calls since cache tables are newly created
 * and TypeScript types haven't been regenerated yet.
 */

import { supabase } from '@/integrations/supabase/client';

export interface CacheOptions {
  ttlHours?: number;
  forceRefresh?: boolean;
}

export interface CacheStats {
  hitCount: number;
  missCount: number;
  hitRatio: number;
  avgCachedResponseMs: number;
  avgUncachedResponseMs: number;
}

/**
 * Get cached revenue forecast
 */
export async function getCachedRevenueForecast<T>(
  organizationId: string,
  cacheKey: string,
  computeFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttlHours = 6, forceRefresh = false } = options;
  const startTime = performance.now();

  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cachedData, error } = await supabase
        .rpc('get_cached_revenue_forecast' as any, {
          p_org_id: organizationId,
          p_cache_key: cacheKey,
        });

      if (!error && cachedData) {
        const responseTime = Math.round(performance.now() - startTime);
        console.log(`[CACHE HIT] ${cacheKey}: ${responseTime}ms`);
        
        // Track cached response time
        await trackCacheMetrics(true, responseTime);
        
        return cachedData as T;
      }
    }

    // Cache miss - compute fresh data
    console.log(`[CACHE MISS] ${cacheKey}: Computing fresh data...`);
    const freshData = await computeFn();
    const computeTime = Math.round(performance.now() - startTime);

    // Store in cache
    await supabase.rpc('set_cached_revenue_forecast' as any, {
      p_org_id: organizationId,
      p_cache_key: cacheKey,
      p_data: JSON.parse(JSON.stringify(freshData)),
      p_ttl_hours: ttlHours,
    });

    // Track uncached response time
    await trackCacheMetrics(false, computeTime);

    console.log(`[CACHE SET] ${cacheKey}: ${computeTime}ms`);
    return freshData;
  } catch (error) {
    console.error(`[CACHE ERROR] ${cacheKey}:`, error);
    throw error;
  }
}

/**
 * Get cached driver performance
 */
export async function getCachedDriverPerformance<T>(
  organizationId: string,
  computeFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const cacheKey = 'driver_performance_all';
  const { ttlHours = 4, forceRefresh = false } = options;
  const startTime = performance.now();

  try {
    if (!forceRefresh) {
      // Use raw SQL query since types not yet regenerated
      const { data: cached, error } = await supabase
        .from('driver_performance_cache' as any)
        .select('performance_data')
        .eq('organization_id', organizationId)
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!error && cached && (cached as any).performance_data) {
        const responseTime = Math.round(performance.now() - startTime);
        console.log(`[CACHE HIT] driver_performance: ${responseTime}ms`);
        
        await trackCacheMetrics(true, responseTime);
        return (cached as any).performance_data as T;
      }
    }

    const freshData = await computeFn();
    const computeTime = Math.round(performance.now() - startTime);

    // Store in cache using raw query
    await supabase
      .from('driver_performance_cache' as any)
      .upsert({
        organization_id: organizationId,
        cache_key: cacheKey,
        performance_data: JSON.parse(JSON.stringify(freshData)),
        expires_at: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
        hit_count: 0,
      });

    await trackCacheMetrics(false, computeTime);
    console.log(`[CACHE SET] driver_performance: ${computeTime}ms`);
    return freshData;
  } catch (error) {
    console.error('[CACHE ERROR] driver_performance:', error);
    throw error;
  }
}

/**
 * Get cached capacity forecast
 */
export async function getCachedCapacity<T>(
  organizationId: string,
  computeFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const cacheKey = 'capacity_forecast';
  const { ttlHours = 2, forceRefresh = false } = options;
  const startTime = performance.now();

  try {
    if (!forceRefresh) {
      const { data: cached, error } = await supabase
        .from('capacity_cache' as any)
        .select('capacity_data')
        .eq('organization_id', organizationId)
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!error && cached && (cached as any).capacity_data) {
        const responseTime = Math.round(performance.now() - startTime);
        console.log(`[CACHE HIT] capacity: ${responseTime}ms`);
        
        await trackCacheMetrics(true, responseTime);
        return (cached as any).capacity_data as T;
      }
    }

    const freshData = await computeFn();
    const computeTime = Math.round(performance.now() - startTime);

    await supabase
      .from('capacity_cache' as any)
      .upsert({
        organization_id: organizationId,
        cache_key: cacheKey,
        capacity_data: JSON.parse(JSON.stringify(freshData)),
        expires_at: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
        hit_count: 0,
      });

    await trackCacheMetrics(false, computeTime);
    console.log(`[CACHE SET] capacity: ${computeTime}ms`);
    return freshData;
  } catch (error) {
    console.error('[CACHE ERROR] capacity:', error);
    throw error;
  }
}

/**
 * Get daily metrics from pre-computed cache
 */
export async function getDailyMetrics(
  organizationId: string,
  date: Date = new Date()
) {
  const dateStr = date.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_metrics_cache' as any)
    .select('*')
    .eq('organization_id', organizationId)
    .eq('metric_date', dateStr)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  // If no cached data, compute it
  if (!data) {
    await supabase.rpc('compute_daily_metrics' as any, {
      p_org_id: organizationId,
      p_date: dateStr,
    });

    // Fetch newly computed data
    const { data: newData, error: newError } = await supabase
      .from('daily_metrics_cache' as any)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('metric_date', dateStr)
      .maybeSingle();

    if (newError) throw newError;
    return newData;
  }

  return data;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  const { data } = await supabase
    .from('system_health' as any)
    .select('cache_hit_count, cache_miss_count, cache_hit_ratio, avg_cached_response_ms, avg_uncached_response_ms')
    .order('check_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  const cacheData = data as any;
  return {
    hitCount: cacheData?.cache_hit_count || 0,
    missCount: cacheData?.cache_miss_count || 0,
    hitRatio: cacheData?.cache_hit_ratio || 0,
    avgCachedResponseMs: cacheData?.avg_cached_response_ms || 0,
    avgUncachedResponseMs: cacheData?.avg_uncached_response_ms || 0,
  };
}

/**
 * Invalidate all caches for an organization
 */
export async function invalidateAllCaches(organizationId: string) {
  const { data, error } = await supabase.rpc('invalidate_all_caches' as any, {
    p_org_id: organizationId,
  });

  if (error) throw error;
  console.log('[CACHE INVALIDATE]', data);
  return data;
}

/**
 * Track cache hit/miss metrics
 */
async function trackCacheMetrics(hit: boolean, responseTimeMs: number) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return;

    const { data: userOrg } = await supabase
      .from('user_organization_roles')
      .select('organization_id')
      .eq('user_id', data.user.id)
      .single();

    if (!userOrg) return;

    // Fire and forget
    supabase.functions.invoke('record-performance-metric', {
      body: {
        organizationId: userOrg.organization_id,
        metricName: hit ? 'cache_hit' : 'cache_miss',
        metricValue: 1,
        metricUnit: 'count',
        metadata: { responseTimeMs },
      },
    }).catch(err => console.debug('[METRICS] Failed:', err));

    // Also record response time if it was a hit
    if (hit) {
      supabase.functions.invoke('record-performance-metric', {
        body: {
          organizationId: userOrg.organization_id,
          metricName: 'cached_query_time',
          metricValue: responseTimeMs,
          metricUnit: 'ms',
        },
      }).catch(err => console.debug('[METRICS] Failed:', err));
    } else {
      supabase.functions.invoke('record-performance-metric', {
        body: {
          organizationId: userOrg.organization_id,
          metricName: 'uncached_query_time',
          metricValue: responseTimeMs,
          metricUnit: 'ms',
        },
      }).catch(err => console.debug('[METRICS] Failed:', err));
    }

    if (import.meta.env.DEV) {
      console.log(`[CACHE METRICS] ${hit ? 'HIT' : 'MISS'}: ${responseTimeMs}ms`);
    }
  } catch (error) {
    console.warn('Failed to track cache metrics:', error);
  }
}
