/**
 * Lighthouse performance monitoring utilities
 * Tracks Core Web Vitals and performance metrics
 */

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
  timestamp: number;
}

let metrics: PerformanceMetrics = {
  fcp: null,
  lcp: null,
  fid: null,
  cls: null,
  ttfb: null,
  timestamp: Date.now(),
};

/**
 * Observe and record Core Web Vitals
 */
export function initPerformanceObserver() {
  if (typeof window === 'undefined') return;

  // First Contentful Paint
  const paintObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        metrics.fcp = entry.startTime;
        console.log(`[PERFORMANCE] FCP: ${entry.startTime.toFixed(2)}ms`);
      }
    }
  });

  try {
    paintObserver.observe({ entryTypes: ['paint'] });
  } catch (e) {
    console.warn('Paint observer not supported');
  }

  // Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    metrics.lcp = lastEntry.startTime;
    console.log(`[PERFORMANCE] LCP: ${lastEntry.startTime.toFixed(2)}ms`);
  });

  try {
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('LCP observer not supported');
  }

  // First Input Delay
  const fidObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fidEntry = entry as PerformanceEventTiming;
      metrics.fid = fidEntry.processingStart - fidEntry.startTime;
      console.log(`[PERFORMANCE] FID: ${metrics.fid.toFixed(2)}ms`);
    }
  });

  try {
    fidObserver.observe({ entryTypes: ['first-input'] });
  } catch (e) {
    console.warn('FID observer not supported');
  }

  // Cumulative Layout Shift
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const layoutShift = entry as any;
      if (!layoutShift.hadRecentInput) {
        clsValue += layoutShift.value;
        metrics.cls = clsValue;
      }
    }
    console.log(`[PERFORMANCE] CLS: ${clsValue.toFixed(4)}`);
  });

  try {
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    console.warn('CLS observer not supported');
  }

  // Time to First Byte
  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    metrics.ttfb = timing.responseStart - timing.requestStart;
    console.log(`[PERFORMANCE] TTFB: ${metrics.ttfb.toFixed(2)}ms`);
  }
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...metrics };
}

/**
 * Log performance summary
 */
export function logPerformanceSummary() {
  console.group('📊 Performance Summary');
  console.log(`FCP: ${metrics.fcp ? metrics.fcp.toFixed(2) + 'ms' : 'N/A'}`);
  console.log(`LCP: ${metrics.lcp ? metrics.lcp.toFixed(2) + 'ms' : 'N/A'}`);
  console.log(`FID: ${metrics.fid ? metrics.fid.toFixed(2) + 'ms' : 'N/A'}`);
  console.log(`CLS: ${metrics.cls ? metrics.cls.toFixed(4) : 'N/A'}`);
  console.log(`TTFB: ${metrics.ttfb ? metrics.ttfb.toFixed(2) + 'ms' : 'N/A'}`);
  
  // Target checks
  const fcpTarget = 2000; // 2s desktop
  const lcpTarget = 2500; // 2.5s target
  
  if (metrics.fcp && metrics.fcp > fcpTarget) {
    console.warn(`⚠️ FCP exceeds target (${fcpTarget}ms)`);
  } else if (metrics.fcp) {
    console.log(`✅ FCP within target`);
  }

  if (metrics.lcp && metrics.lcp > lcpTarget) {
    console.warn(`⚠️ LCP exceeds target (${lcpTarget}ms)`);
  } else if (metrics.lcp) {
    console.log(`✅ LCP within target`);
  }

  console.groupEnd();
}

/**
 * Export metrics for analysis
 */
export function exportPerformanceMetrics() {
  return {
    ...metrics,
    url: window.location.href,
    userAgent: navigator.userAgent,
  };
}
