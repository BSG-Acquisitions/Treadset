import { QueryClient } from '@tanstack/react-query';

/**
 * Optimized query cache configuration for improved performance
 * - Extended stale times for stable data
 * - Aggressive garbage collection
 * - Smart retry logic
 */
export const createOptimizedQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache queries for 5 minutes by default
        staleTime: 5 * 60 * 1000,
        // Keep unused data for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry failed queries twice with exponential backoff
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus for real-time data
        refetchOnWindowFocus: true,
        // Don't refetch on reconnect by default
        refetchOnReconnect: false,
        // Refetch on mount for stale data
        refetchOnMount: true,
      },
      mutations: {
        // Retry mutations once
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
};

/**
 * Cache key configurations for different data types
 */
export const cacheKeys = {
  // Static data - cache for 1 hour
  static: {
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  },
  // Real-time data - cache for 30 seconds
  realtime: {
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  },
  // User-specific data - cache for 5 minutes
  user: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  // Analytics data - cache for 15 minutes
  analytics: {
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
  // AI-generated data - cache for 10 minutes
  ai: {
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  },
};

/**
 * Prefetch common queries for faster navigation
 */
export const prefetchCommonQueries = async (queryClient: QueryClient, orgId: string) => {
  // Prefetch clients list
  await queryClient.prefetchQuery({
    queryKey: ['clients', orgId],
    staleTime: cacheKeys.user.staleTime,
  });

  // Prefetch vehicles
  await queryClient.prefetchQuery({
    queryKey: ['vehicles', orgId],
    staleTime: cacheKeys.user.staleTime,
  });

  // Prefetch today's pickups
  const today = new Date().toISOString().split('T')[0];
  await queryClient.prefetchQuery({
    queryKey: ['pickups', today, orgId],
    staleTime: cacheKeys.realtime.staleTime,
  });
};
