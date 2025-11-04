/**
 * API Performance Monitoring
 * Tracks response times for all edge functions
 */

import { getOptimizedClient } from '../_shared/optimizedClient.ts';
import { createOptimizedResponse } from '../_shared/compression.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = getOptimizedClient();
    
    // Get performance logs from last 24 hours
    const { data: perfLogs, error: perfError } = await supabaseClient
      .from('performance_logs')
      .select('query_name, execution_time_ms')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);

    if (perfError) throw perfError;

    // Aggregate by query name
    const aggregated = new Map<string, { sum: number; count: number; min: number; max: number }>();
    
    perfLogs?.forEach(log => {
      const existing = aggregated.get(log.query_name) || { sum: 0, count: 0, min: Infinity, max: 0 };
      existing.sum += log.execution_time_ms;
      existing.count++;
      existing.min = Math.min(existing.min, log.execution_time_ms);
      existing.max = Math.max(existing.max, log.execution_time_ms);
      aggregated.set(log.query_name, existing);
    });

    // Calculate statistics
    const endpoints = Array.from(aggregated.entries()).map(([name, stats]) => ({
      endpoint: name,
      avgMs: Math.round(stats.sum / stats.count),
      minMs: stats.min,
      maxMs: stats.max,
      callCount: stats.count,
      p95Ms: stats.max, // Approximation
    })).sort((a, b) => b.avgMs - a.avgMs);

    // Get cache statistics
    const { data: cacheStats } = await supabaseClient
      .from('system_health')
      .select('cache_hit_count, cache_miss_count, cache_hit_ratio')
      .order('check_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    const result = {
      timestamp: new Date().toISOString(),
      period: '24h',
      endpoints,
      summary: {
        totalEndpoints: endpoints.length,
        totalCalls: endpoints.reduce((sum, e) => sum + e.callCount, 0),
        avgResponseTime: Math.round(endpoints.reduce((sum, e) => sum + e.avgMs, 0) / endpoints.length),
        slowestEndpoint: endpoints[0]?.endpoint || 'N/A',
        fastestEndpoint: endpoints[endpoints.length - 1]?.endpoint || 'N/A',
      },
      cache: {
        hitCount: (cacheStats as any)?.cache_hit_count || 0,
        missCount: (cacheStats as any)?.cache_miss_count || 0,
        hitRatio: (cacheStats as any)?.cache_hit_ratio || 0,
      },
    };

    return await createOptimizedResponse(result, 200);
  } catch (error) {
    console.error('Performance monitoring failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
