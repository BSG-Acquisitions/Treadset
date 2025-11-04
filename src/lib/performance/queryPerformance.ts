/**
 * Query Performance Measurement and Logging
 * Tracks execution time and logs slow queries to performance_logs
 */

import { supabase } from '@/integrations/supabase/client';

export interface QueryMetrics {
  queryName: string;
  executionTimeMs: number;
  rowsReturned?: number;
  params?: Record<string, any>;
}

/**
 * Measure and log query performance
 */
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  params?: Record<string, any>
): Promise<{ data: T; metrics: QueryMetrics }> {
  const startTime = performance.now();
  
  try {
    const data = await queryFn();
    const executionTimeMs = Math.round(performance.now() - startTime);
    
    const metrics: QueryMetrics = {
      queryName,
      executionTimeMs,
      rowsReturned: Array.isArray(data) ? data.length : undefined,
      params,
    };

    // Log slow queries (>250ms) to database
    if (executionTimeMs > 250) {
      await logSlowQuery(metrics);
    }

    // Always log to console in development
    if (import.meta.env.DEV) {
      const color = executionTimeMs > 1000 ? 'color: red' : executionTimeMs > 500 ? 'color: orange' : 'color: green';
      console.log(
        `%c[QUERY] ${queryName}: ${executionTimeMs}ms`,
        color,
        params
      );
    }

    return { data, metrics };
  } catch (error) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    console.error(`[QUERY ERROR] ${queryName}: ${executionTimeMs}ms`, error);
    throw error;
  }
}

/**
 * Log slow query to performance_logs table
 */
async function logSlowQuery(metrics: QueryMetrics): Promise<void> {
  try {
    await supabase.rpc('log_slow_query', {
      p_query_name: metrics.queryName,
      p_execution_time_ms: metrics.executionTimeMs,
      p_rows_returned: metrics.rowsReturned,
      p_query_params: metrics.params ? JSON.parse(JSON.stringify(metrics.params)) : null,
    });
  } catch (error) {
    // Don't fail the original query if logging fails
    console.warn('Failed to log slow query:', error);
  }
}

/**
 * Get performance statistics for a query
 */
export async function getQueryStats(queryName: string, days: number = 7) {
  const { data, error } = await supabase
    .from('performance_logs')
    .select('*')
    .eq('query_name', queryName)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (!data || data.length === 0) {
    return {
      queryName,
      count: 0,
      avgMs: 0,
      minMs: 0,
      maxMs: 0,
      p95Ms: 0,
    };
  }

  const times = data.map(d => d.execution_time_ms).sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const p95Index = Math.floor(times.length * 0.95);

  return {
    queryName,
    count: data.length,
    avgMs: Math.round(sum / data.length),
    minMs: times[0],
    maxMs: times[times.length - 1],
    p95Ms: times[p95Index],
  };
}

/**
 * Get top 25 slowest queries
 */
export async function getSlowQueries(days: number = 7) {
  const { data, error } = await supabase
    .from('performance_logs')
    .select('query_name, execution_time_ms')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('execution_time_ms', { ascending: false })
    .limit(100);

  if (error) throw error;
  if (!data) return [];

  // Group by query name and calculate averages
  const queryMap = new Map<string, { sum: number; count: number; max: number }>();
  
  data.forEach(log => {
    const existing = queryMap.get(log.query_name) || { sum: 0, count: 0, max: 0 };
    existing.sum += log.execution_time_ms;
    existing.count += 1;
    existing.max = Math.max(existing.max, log.execution_time_ms);
    queryMap.set(log.query_name, existing);
  });

  // Convert to array and sort by average
  const results = Array.from(queryMap.entries())
    .map(([queryName, stats]) => ({
      queryName,
      avgMs: Math.round(stats.sum / stats.count),
      maxMs: stats.max,
      count: stats.count,
    }))
    .filter(q => q.avgMs > 250)
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 25);

  return results;
}
