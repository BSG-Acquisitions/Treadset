import { useEffect, useRef } from 'react';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Performance monitoring hook for tracking render times and operations
 * Logs metrics for analysis and optimization
 */
export const usePerformanceMonitor = (componentName: string, enabled = true) => {
  const renderStartTime = useRef<number>(Date.now());
  const metricsBuffer = useRef<PerformanceMetric[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const renderDuration = Date.now() - renderStartTime.current;
    
    // Log slow renders (>100ms)
    if (renderDuration > 100) {
      console.warn(`[PERFORMANCE] Slow render: ${componentName} took ${renderDuration}ms`);
    }

    // Buffer metrics
    metricsBuffer.current.push({
      name: `${componentName}_render`,
      duration: renderDuration,
      timestamp: Date.now(),
    });

    // Flush buffer every 10 metrics
    if (metricsBuffer.current.length >= 10) {
      flushMetrics();
    }

    return () => {
      renderStartTime.current = Date.now();
    };
  });

  const flushMetrics = async () => {
    const metrics = [...metricsBuffer.current];
    metricsBuffer.current = [];

    // Only log in development
    if (import.meta.env.DEV) {
      console.log('[PERFORMANCE] Metrics:', metrics);
    }
  };

  const trackOperation = async (operationName: string, operation: () => Promise<any>) => {
    const startTime = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      metricsBuffer.current.push({
        name: operationName,
        duration,
        timestamp: Date.now(),
      });

      if (duration > 1000) {
        console.warn(`[PERFORMANCE] Slow operation: ${operationName} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`[PERFORMANCE] Failed operation: ${operationName} (${duration}ms)`, error);
      throw error;
    }
  };

  return {
    trackOperation,
    flushMetrics,
  };
};

/**
 * Hook for tracking query performance
 */
export const useQueryPerformance = (queryKey: string) => {
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const duration = Date.now() - startTimeRef.current;
    
    if (duration > 500) {
      console.warn(`[QUERY PERFORMANCE] Slow query: ${queryKey} took ${duration}ms`);
    }

    // Reset for next render
    startTimeRef.current = Date.now();
  });
};

/**
 * Track network request performance
 */
export const trackNetworkPerformance = async <T>(
  requestName: string,
  request: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await request();
    const duration = performance.now() - startTime;

    if (duration > 2000) {
      console.warn(`[NETWORK] Slow request: ${requestName} took ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[NETWORK] Failed request: ${requestName} (${duration}ms)`, error);
    throw error;
  }
};
