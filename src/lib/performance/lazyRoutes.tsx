import { lazy } from 'react';

/**
 * Lazy-loaded route components for code splitting
 * Reduces initial bundle size and improves Time to Interactive (TTI)
 */

// Heavy dashboard pages
export const LazyClientAnalytics = lazy(() => import('@/pages/ClientAnalytics'));
export const LazyReports = lazy(() => import('@/pages/Reports'));
export const LazyMichiganReports = lazy(() => import('@/pages/MichiganReports'));

// Route optimization pages
export const LazyEnhancedRoutesToday = lazy(() => import('@/pages/EnhancedRoutesToday'));
export const LazyDriverRoutes = lazy(() => import('@/pages/DriverRoutes'));

// Heavy manifest pages
export const LazyManifests = lazy(() => import('@/pages/Manifests'));
export const LazyManifestViewer = lazy(() => import('@/pages/ManifestViewer'));

// Driver interfaces
export const LazyDriverDashboard = lazy(() => import('@/pages/DriverDashboard'));
export const LazyDriverManifests = lazy(() => import('@/pages/DriverManifests'));
export const LazyDriverManifestCreate = lazy(() => import('@/pages/DriverManifestCreate'));

// Hauler interfaces
export const LazyHaulerDashboard = lazy(() => import('@/pages/HaulerDashboard'));
export const LazyHaulerManifests = lazy(() => import('@/pages/HaulerManifests'));
export const LazyHaulerManifestCreate = lazy(() => import('@/pages/HaulerManifestCreate'));

// Admin/settings pages
export const LazyEmployees = lazy(() => import('@/pages/Employees'));
export const LazySettings = lazy(() => import('@/pages/Settings'));
export const LazyDataQuality = lazy(() => import('@/pages/DataQuality'));
export const LazyDeploymentDashboard = lazy(() => import('@/pages/DeploymentDashboard'));

// Integration pages
export const LazyIntegrations = lazy(() => import('@/pages/Integrations'));

/**
 * Suspense fallback component for lazy routes
 */
export const RouteFallback = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};
