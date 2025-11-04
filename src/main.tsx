import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mobile.css'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import SecurityBoundary from './components/security/SecurityBoundary.tsx'
import { initPerformanceObserver, logPerformanceSummary } from './lib/performance/lighthouse'
import { preloadCriticalResources } from './lib/performance/bundleOptimization'

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
