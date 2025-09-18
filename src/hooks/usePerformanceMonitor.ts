import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  mountTime: number;
  componentName: string;
}

interface UsePerformanceMonitorOptions {
  componentName: string;
  enableLogging?: boolean;
  threshold?: number; // Log if render time exceeds threshold (ms)
}

export const usePerformanceMonitor = ({
  componentName,
  enableLogging = process.env.NODE_ENV === 'development',
  threshold = 16 // 16ms = 60fps threshold
}: UsePerformanceMonitorOptions) => {
  const mountTimeRef = useRef<number>(Date.now());
  const renderStartRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);

  const startRender = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);

  const endRender = useCallback(() => {
    const renderTime = performance.now() - renderStartRef.current;
    renderCountRef.current += 1;

    const metrics: PerformanceMetrics = {
      renderTime,
      mountTime: Date.now() - mountTimeRef.current,
      componentName
    };

    if (enableLogging && renderTime > threshold) {
      console.warn(`[Performance] ${componentName} slow render:`, {
        ...metrics,
        renderCount: renderCountRef.current,
        averageRenderTime: metrics.mountTime / renderCountRef.current
      });
    }

    return metrics;
  }, [componentName, enableLogging, threshold]);

  // Auto-start render timing on each render
  useEffect(() => {
    startRender();
    return () => {
      endRender();
    };
  });

  const measureAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      if (enableLogging && duration > threshold) {
        console.warn(`[Performance] ${componentName}.${operationName} slow operation:`, {
          duration,
          operationName
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[Performance] ${componentName}.${operationName} failed:`, {
        duration,
        error
      });
      throw error;
    }
  }, [componentName, enableLogging, threshold]);

  const measureSync = useCallback(<T>(
    operation: () => T,
    operationName: string
  ): T => {
    const start = performance.now();
    try {
      const result = operation();
      const duration = performance.now() - start;
      
      if (enableLogging && duration > threshold) {
        console.warn(`[Performance] ${componentName}.${operationName} slow operation:`, {
          duration,
          operationName
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[Performance] ${componentName}.${operationName} failed:`, {
        duration,
        error
      });
      throw error;
    }
  }, [componentName, enableLogging, threshold]);

  return {
    startRender,
    endRender,
    measureAsync,
    measureSync,
    renderCount: renderCountRef.current
  };
};