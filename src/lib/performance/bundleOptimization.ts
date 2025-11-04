/**
 * Bundle optimization utilities
 * Tree-shaking helpers and dynamic imports
 */

/**
 * Dynamically import heavy dependencies only when needed
 */
export const lazyImports = {
  // PDF generation
  pdfLib: () => import('pdf-lib'),
  jsPDF: () => import('jspdf'),
  html2canvas: () => import('html2canvas'),
  
  // Mapping
  mapboxGl: () => import('mapbox-gl'),
  
  // Canvas/Drawing
  fabric: () => import('fabric'),
  
  // Date utilities (use date-fns with tree-shaking)
  dateFns: {
    format: () => import('date-fns/format'),
    parseISO: () => import('date-fns/parseISO'),
    differenceInDays: () => import('date-fns/differenceInDays'),
    addDays: () => import('date-fns/addDays'),
  },
};

/**
 * Preload critical resources
 */
export function preloadCriticalResources() {
  // Preload fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.as = 'font';
  fontLink.type = 'font/woff2';
  fontLink.crossOrigin = 'anonymous';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
  document.head.appendChild(fontLink);
}

/**
 * Check if resource should be lazy loaded
 */
export function shouldLazyLoad(size: number): boolean {
  return size > 100 * 1024; // 100 KB threshold
}

/**
 * Code splitting helper for route-based chunks
 */
export function createRouteChunk(importFn: () => Promise<any>) {
  return {
    component: importFn,
    preload: () => importFn(),
  };
}
