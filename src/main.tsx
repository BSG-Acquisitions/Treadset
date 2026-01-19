import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mobile.css'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import SecurityBoundary from './components/security/SecurityBoundary.tsx'
import { initPerformanceObserver, logPerformanceSummary } from './lib/performance/lighthouse'
import { preloadCriticalResources } from './lib/performance/bundleOptimization'
import { initializeSecurity } from './utils/securityUtils'

// Global error capture - MUST be before anything else
// Captures crashes even if React never mounts
window.addEventListener('error', (event) => {
  console.error('[GLOBAL_ERROR]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack || event.error,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UNHANDLED_PROMISE]', {
    reason: event.reason?.stack || event.reason?.message || event.reason,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
});

// Initialize security measures (CSP, security headers)
initializeSecurity();

// Initialize performance monitoring
if (import.meta.env.PROD) {
  initPerformanceObserver();
  
  // Log performance summary after page load
  window.addEventListener('load', () => {
    setTimeout(logPerformanceSummary, 3000);
  });
}

// Preload critical resources
preloadCriticalResources();

createRoot(document.getElementById("root")!).render(
  <SecurityBoundary>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </SecurityBoundary>
);
