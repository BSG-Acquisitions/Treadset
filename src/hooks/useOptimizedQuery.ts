import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQueryPerformance } from './usePerformanceMonitor';

/**
 * Optimized query hook with performance monitoring
 * Automatically tracks slow queries and provides caching strategies
 */
export function useOptimizedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[]
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  const queryKey = Array.isArray(options.queryKey) 
    ? options.queryKey.join('-') 
    : String(options.queryKey);

  useQueryPerformance(queryKey);

  return useQuery({
    ...options,
    // Add retry logic with exponential backoff
    retry: options.retry ?? 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Enable stale-while-revalidate pattern
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutes
    gcTime: options.gcTime ?? 10 * 60 * 1000, // 10 minutes
    // Refetch on window focus for data freshness
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
    // Refetch on mount if data is fresh
    refetchOnMount: options.refetchOnMount ?? true,
  });
}

/**
 * Hook for real-time data with aggressive refresh
 */
export function useRealtimeQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[]
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  return useOptimizedQuery({
    ...options,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for static data with extended caching
 */
export function useStaticQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[]
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  return useOptimizedQuery({
    ...options,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
