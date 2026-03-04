// App.tsx - Build timestamp: 2025-12-05T18:30:00Z
import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { AIAssistant } from "@/components/AIAssistant";
import { createOptimizedQueryClient } from "@/lib/performance/queryCache";
import { RouteFallback } from "@/lib/performance/lazyRoutes";
import { FEATURE_FLAGS } from "./lib/featureFlags";

// Only eagerly load pages that are entry points or always needed
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-load all other pages
const Index = lazy(() => import('./pages/Index'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const Clients = lazy(() => import('./pages/Clients'));
const RoutesPrintToday = lazy(() => import('./pages/RoutesPrintToday'));
const Book = lazy(() => import('./pages/Book'));
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Employees = lazy(() => import('./pages/Employees'));
const ClientAnalytics = lazy(() => import('./pages/ClientAnalytics'));
const Settings = lazy(() => import('./pages/Settings'));
const EnhancedRoutesToday = lazy(() => import('./pages/EnhancedRoutesToday'));
const Integrations = lazy(() => import('./pages/Integrations'));
const DriverManifests = lazy(() => import('./pages/DriverManifests'));
const DriverManifestCreate = lazy(() => import('./pages/DriverManifestCreate'));
const DriverManifestView = lazy(() => import('./pages/DriverManifestView'));
const DriverRoutes = lazy(() => import('./pages/DriverRoutes'));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));
const DriverAssignmentHelper = lazy(() => import('./pages/DriverAssignmentHelper'));
const DriverAssignmentView = lazy(() => import('./pages/DriverAssignmentView'));
const PublicBook = lazy(() => import('./pages/PublicBook'));
const PublicBookingConfirmation = lazy(() => import('./pages/PublicBookingConfirmation'));
const ManifestViewer = lazy(() => import('./pages/ManifestViewer'));
const Invite = lazy(() => import('./pages/Invite'));
const ClientInvite = lazy(() => import('./pages/ClientInvite'));
const ClientTeamInvite = lazy(() => import('./pages/ClientTeamInvite'));
const ReceiverSignatures = lazy(() => import('./pages/ReceiverSignatures'));
const ReceiverManagement = lazy(() => import('./pages/ReceiverManagement'));
const Reports = lazy(() => import('./pages/Reports'));
const StateComplianceReports = lazy(() => import('./pages/StateComplianceReports'));
const Dropoffs = lazy(() => import('./pages/Dropoffs'));
const IndependentHaulers = lazy(() => import('./pages/IndependentHaulers'));
const HaulerDashboard = lazy(() => import('./pages/HaulerDashboard'));
const HaulerCustomers = lazy(() => import('./pages/HaulerCustomers'));
const HaulerRates = lazy(() => import('./pages/HaulerRates'));
const HaulerManifests = lazy(() => import('./pages/HaulerManifests'));
const HaulerManifestCreate = lazy(() => import('./pages/HaulerManifestCreate'));
const DriverSchedulePickup = lazy(() => import('./pages/DriverSchedulePickup'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancelled = lazy(() => import('./pages/PaymentCancelled'));
const DriverPaymentSuccess = lazy(() => import('./pages/driver/PaymentSuccess'));
const DriverPaymentCancelled = lazy(() => import('./pages/driver/PaymentCancelled'));
const DriverOutboundCreate = lazy(() => import('./pages/driver/DriverOutboundCreate'));
const DriverOutboundManifests = lazy(() => import('./pages/driver/DriverOutboundManifests'));
const OutboundSchedule = lazy(() => import('./pages/OutboundSchedule'));
const Manifests = lazy(() => import('./pages/Manifests'));
const BackfillManifestPdfs = lazy(() => import('./pages/BackfillManifestPdfs'));
const DeploymentDashboard = lazy(() => import('./pages/DeploymentDashboard'));
const DataQuality = lazy(() => import('./pages/DataQuality'));
const IntelligenceDashboard = lazy(() => import('./pages/IntelligenceDashboard'));
const TrailerInventory = lazy(() => import('./pages/TrailerInventory'));
const TrailerRoutes = lazy(() => import('./pages/TrailerRoutes'));
const TrailerRouteDetail = lazy(() => import('./pages/TrailerRouteDetail'));
const TrailerExternalMoves = lazy(() => import('./pages/TrailerExternalMoves'));
const TrailerVehicles = lazy(() => import('./pages/TrailerVehicles'));
const DriverTrailerAssignments = lazy(() => import('./pages/DriverTrailerAssignments'));
const TrailerDriverManagement = lazy(() => import('./pages/TrailerDriverManagement'));
const TrailerReports = lazy(() => import('./pages/TrailerReports'));
const BookingRequests = lazy(() => import('./pages/BookingRequests'));
const ServiceZones = lazy(() => import('./pages/ServiceZones'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const PortalUnsubscribe = lazy(() => import('./pages/PortalUnsubscribe'));
const PortalInvites = lazy(() => import('./pages/PortalInvites'));
const PublicLanding = lazy(() => import('./pages/PublicLanding'));
const AppLanding = lazy(() => import('./pages/AppLanding'));
const Inventory = lazy(() => import('./pages/Inventory'));
const InventoryProducts = lazy(() => import('./pages/InventoryProducts'));
const InventoryReports = lazy(() => import('./pages/InventoryReports'));
const Shipments = lazy(() => import('./pages/Shipments'));
const StateTemplateManager = lazy(() => import('./pages/admin/StateTemplateManager'));
const PublicDropoff = lazy(() => import('./pages/PublicDropoff'));
const PublicServices = lazy(() => import('./pages/PublicServices'));
const PublicPartners = lazy(() => import('./pages/PublicPartners'));
const PublicPartnerApply = lazy(() => import('./pages/PublicPartnerApply'));
const PublicAbout = lazy(() => import('./pages/PublicAbout'));
const PublicContact = lazy(() => import('./pages/PublicContact'));
const PublicProducts = lazy(() => import('./pages/PublicProducts'));
const PartnerApplications = lazy(() => import('./pages/PartnerApplications'));
const ContactSubmissions = lazy(() => import('./pages/ContactSubmissions'));
const ManifestHealth = lazy(() => import('./pages/ManifestHealth'));

// Domain-based routing: show BSG marketing on bsgtires domains, TreadSet app landing elsewhere
function RootRoute() {
  const hostname = window.location.hostname;
  
  // BSG-specific domains show BSG marketing
  if (hostname.includes('bsg') || hostname.includes('bsgtires')) {
    return <PublicLanding />;
  }
  
  // All other domains (treadset, lovable, localhost) show TreadSet app landing
  return <AppLanding />;
}

const queryClient = createOptimizedQueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DemoModeProvider>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
{/* Public Marketing Routes - No Authentication Required */}
              <Route path="/" element={<RootRoute />} />
              <Route path="/services" element={<PublicServices />} />
              <Route path="/products" element={<PublicProducts />} />
              <Route path="/drop-off" element={<PublicDropoff />} />
              <Route path="/partners" element={<PublicPartners />} />
              <Route path="/partner-apply" element={<PublicPartnerApply />} />
              <Route path="/about" element={<PublicAbout />} />
              <Route path="/contact" element={<PublicContact />} />
              
              {/* Public Booking Routes */}
              <Route path="/public-book" element={<PublicBook />} />
              <Route path="/public-booking-confirmation" element={<PublicBookingConfirmation />} />
              <Route path="/invite/:token" element={<Invite />} />
              <Route path="/client-invite/:token" element={<ClientInvite />} />
              <Route path="/client-team-invite/:token" element={<ClientTeamInvite />} />
              <Route path="/portal-unsubscribe" element={<PortalUnsubscribe />} />
              
              {/* Auth Routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/sign-in" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Protected Routes with Layout */}
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Index />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'sales']}>
                  <AppLayout>
                    <Clients />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/clients/:id" element={
                <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'sales']}>
                  <AppLayout>
                    <ClientDetail />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/routes/today" element={
                <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'sales']}>
                  <AppLayout>
                    <EnhancedRoutesToday />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/routes/print/today" element={
                <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'sales']}>
                  <AppLayout>
                    <RoutesPrintToday />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/book" element={
                <ProtectedRoute roles={['driver', 'admin']}>
                  <AppLayout>
                    <DriverSchedulePickup />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/employees" element={
                <ProtectedRoute roles={['admin']}>
                  <AppLayout>
                    <Employees />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <AppLayout>
                    <ClientAnalytics />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings/portal-invites" element={
                <ProtectedRoute roles={['admin', 'ops_manager', 'sales']}>
                  <AppLayout>
                    <PortalInvites />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/booking-confirmation" element={
                <ProtectedRoute>
                  <AppLayout>
                    <BookingConfirmation />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/integrations" element={
                <ProtectedRoute roles={['admin']}>
                  <AppLayout>
                    <Integrations />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/manifests" element={
                <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'sales']}>
                  <AppLayout>
                    <Manifests />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/manifests/:id" element={
                <ProtectedRoute roles={['admin', 'ops_manager', 'sales', 'driver']}>
                  <AppLayout>
                    <ManifestViewer />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/manifests/backfill" element={
                <ProtectedRoute roles={['super_admin']}>
                  <AppLayout>
                    <BackfillManifestPdfs />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/driver/manifests" element={
                <ProtectedRoute roles={['driver', 'admin']}>
                  <AppLayout>
                    <DriverManifests />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/driver/manifest/new" element={
                <ProtectedRoute roles={['driver', 'admin']}>
                  <AppLayout>
                    <DriverManifestCreate />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/driver/manifest/:id" element={
                <ProtectedRoute roles={['driver', 'admin']}>
                  <AppLayout>
                    <ManifestViewer />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/routes/driver" element={
                <ProtectedRoute roles={['driver', 'admin']}>
                  <AppLayout>
                    <DriverRoutes />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/driver-assignment-helper" element={
                <ProtectedRoute roles={['admin']}>
                  <AppLayout>
                    <DriverAssignmentHelper />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/driver/dashboard" element={
                <ProtectedRoute roles={['driver', 'admin']}>
                  <AppLayout>
                    <DriverDashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/driver/assignment/:assignmentId" element={
                <ProtectedRoute roles={['driver', 'admin']}>
                  <AppLayout>
                    <DriverAssignmentView />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/driver/payment-success" element={
                <ProtectedRoute roles={['driver', 'admin']}>
                  <DriverPaymentSuccess />
                </ProtectedRoute>
              } />
              <Route path="/driver/payment-cancelled" element={
                <ProtectedRoute roles={['driver', 'admin']}>
                  <DriverPaymentCancelled />
                </ProtectedRoute>
              } />
              <Route path="/driver/outbound/new" element={
                <ProtectedRoute roles={['driver', 'admin']}>
                  <AppLayout>
                    <DriverOutboundCreate />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/driver/outbound" element={
                <ProtectedRoute roles={['driver', 'admin']}>
                  <AppLayout>
                    <DriverOutboundManifests />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/outbound-schedule" element={
                <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
                  <AppLayout>
                    <OutboundSchedule />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/receiver-signatures" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <AppLayout>
                    <ReceiverSignatures />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/haulers" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <IndependentHaulers />
                </ProtectedRoute>
              } />
              <Route path="/partner-applications" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <PartnerApplications />
                </ProtectedRoute>
              } />
              <Route path="/contact-submissions" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <ContactSubmissions />
                </ProtectedRoute>
              } />
              <Route path="/receivers" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <AppLayout>
                    <ReceiverManagement />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <AppLayout>
                    <Reports />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/reports/compliance" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <AppLayout>
                    <StateComplianceReports />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/dropoffs" element={
                <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'sales']}>
                  <AppLayout>
                    <Dropoffs />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/shipments" element={
                <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
                  <AppLayout>
                    <Shipments />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/hauler-dashboard" element={<ProtectedRoute><HaulerDashboard /></ProtectedRoute>} />
              <Route path="/hauler-customers" element={<ProtectedRoute><HaulerCustomers /></ProtectedRoute>} />
              <Route path="/hauler-manifests" element={<ProtectedRoute><HaulerManifests /></ProtectedRoute>} />
              <Route path="/hauler-manifest-create" element={<ProtectedRoute><HaulerManifestCreate /></ProtectedRoute>} />
              <Route path="/hauler-rates" element={<ProtectedRoute roles={['admin', 'ops_manager']}><HaulerRates /></ProtectedRoute>} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancelled" element={<PaymentCancelled />} />
              <Route path="/intelligence" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <AppLayout>
                    <IntelligenceDashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/deployment" element={
                <ProtectedRoute roles={['super_admin']}>
                  <AppLayout>
                    <DeploymentDashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/data-quality" element={
                <ProtectedRoute roles={['super_admin']}>
                  <AppLayout>
                    <DataQuality />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Admin State Template Manager */}
              <Route path="/admin/state-templates" element={
                <ProtectedRoute roles={['admin']}>
                  <AppLayout>
                    <StateTemplateManager />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Trailer Management Routes - Feature Flag Protected */}
              <Route path="/trailers" element={
                FEATURE_FLAGS.TRAILERS ? (
                  <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'sales']}>
                    <AppLayout>
                      <TrailerInventory />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              <Route path="/trailers/inventory" element={
                FEATURE_FLAGS.TRAILERS ? (
                  <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'sales']}>
                    <AppLayout>
                      <TrailerInventory />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              <Route path="/trailers/routes" element={
                FEATURE_FLAGS.TRAILERS ? (
                  <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'sales']}>
                    <AppLayout>
                      <TrailerRoutes />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              <Route path="/trailers/routes/:routeId" element={
                FEATURE_FLAGS.TRAILERS ? (
                  <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'sales']}>
                    <AppLayout>
                      <TrailerRouteDetail />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              <Route path="/trailers/vehicles" element={
                FEATURE_FLAGS.TRAILERS ? (
                  <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'sales']}>
                    <AppLayout>
                      <TrailerVehicles />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              <Route path="/trailers/external-moves" element={
                FEATURE_FLAGS.TRAILERS ? (
                  <ProtectedRoute roles={['admin']}>
                    <AppLayout>
                      <TrailerExternalMoves />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              <Route path="/trailers/drivers" element={
                FEATURE_FLAGS.TRAILERS ? (
                  <ProtectedRoute roles={['admin', 'ops_manager']}>
                    <AppLayout>
                      <TrailerDriverManagement />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              <Route path="/trailers/reports" element={
                FEATURE_FLAGS.TRAILERS ? (
                  <ProtectedRoute roles={['admin', 'ops_manager']}>
                    <AppLayout>
                      <TrailerReports />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              
              {/* Driver Trailer Assignments */}
              <Route path="/driver/trailer-assignments" element={
                FEATURE_FLAGS.TRAILERS ? (
                  <ProtectedRoute roles={['driver', 'admin']}>
                    <AppLayout>
                      <DriverTrailerAssignments />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              
              {/* Booking Management Routes */}
              <Route path="/booking-requests" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <AppLayout>
                    <BookingRequests />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/service-zones" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <AppLayout>
                    <ServiceZones />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Inventory Management Routes - Feature Flag Protected */}
              <Route path="/inventory" element={
                FEATURE_FLAGS.INVENTORY ? (
                  <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
                    <AppLayout>
                      <Inventory />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              <Route path="/inventory/products" element={
                FEATURE_FLAGS.INVENTORY ? (
                  <ProtectedRoute roles={['admin', 'ops_manager']}>
                    <AppLayout>
                      <InventoryProducts />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              <Route path="/inventory/reports" element={
                FEATURE_FLAGS.INVENTORY ? (
                  <ProtectedRoute roles={['admin', 'ops_manager']}>
                    <AppLayout>
                      <InventoryReports />
                    </AppLayout>
                  </ProtectedRoute>
                ) : <NotFound />
              } />
              
              {/* Client Portal - For external clients to view their manifests, admins can preview */}
              <Route path="/client-portal" element={
                <ProtectedRoute roles={['admin', 'ops_manager', 'client']}>
                  <ClientPortal />
                </ProtectedRoute>
              } />

              {/* Manifest Health Scan - Admin/Ops only */}
              <Route path="/manifest-health" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <AppLayout>
                    <ManifestHealth />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Catch-all 404 - Must be last */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </DemoModeProvider>
            <AIAssistant />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
