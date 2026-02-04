// App.tsx - Build timestamp: 2025-12-05T18:30:00Z
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { AIAssistant } from "@/components/AIAssistant";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClientDetail from "./pages/ClientDetail";
import Clients from "./pages/Clients";
import RoutesPrintToday from "./pages/RoutesPrintToday";
import Book from "./pages/Book";
import BookingConfirmation from "./pages/BookingConfirmation";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Employees from "./pages/Employees";
import ClientAnalytics from "./pages/ClientAnalytics";
import Settings from "./pages/Settings";
import EnhancedRoutesToday from "./pages/EnhancedRoutesToday";
import Integrations from "./pages/Integrations";
import DriverManifests from "./pages/DriverManifests";
import DriverManifestCreate from "./pages/DriverManifestCreate";
import DriverManifestView from "./pages/DriverManifestView";
import DriverRoutes from "./pages/DriverRoutes";
import DriverDashboard from "./pages/DriverDashboard";
import DriverAssignmentHelper from "./pages/DriverAssignmentHelper";
import DriverAssignmentView from "./pages/DriverAssignmentView";
import PublicBook from "./pages/PublicBook";
import PublicBookingConfirmation from "./pages/PublicBookingConfirmation";
import ManifestViewer from './pages/ManifestViewer';
import Invite from './pages/Invite';
import ClientInvite from './pages/ClientInvite';
import ClientTeamInvite from './pages/ClientTeamInvite';
import ReceiverSignatures from './pages/ReceiverSignatures';
import ReceiverManagement from './pages/ReceiverManagement';
import Reports from './pages/Reports';
import MichiganReports from './pages/MichiganReports';
import Dropoffs from './pages/Dropoffs';
import IndependentHaulers from './pages/IndependentHaulers';
import HaulerDashboard from './pages/HaulerDashboard';
import HaulerCustomers from './pages/HaulerCustomers';
import HaulerRates from './pages/HaulerRates';
import HaulerManifests from './pages/HaulerManifests';
import HaulerManifestCreate from './pages/HaulerManifestCreate';
import DriverSchedulePickup from "./pages/DriverSchedulePickup";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import DriverPaymentSuccess from "./pages/driver/PaymentSuccess";
import DriverPaymentCancelled from "./pages/driver/PaymentCancelled";
import DriverOutboundCreate from "./pages/driver/DriverOutboundCreate";
import DriverOutboundManifests from "./pages/driver/DriverOutboundManifests";
import OutboundSchedule from "./pages/OutboundSchedule";
import Manifests from "./pages/Manifests";
import BackfillManifestPdfs from "./pages/BackfillManifestPdfs";
import DeploymentDashboard from "./pages/DeploymentDashboard";
import NotificationTest from "./pages/NotificationTest";
import ManifestRemindersTest from "./pages/ManifestRemindersTest";
import DataQuality from "./pages/DataQuality";
import IntelligenceDashboard from "./pages/IntelligenceDashboard";
import TrailerInventory from "./pages/TrailerInventory";
import TrailerRoutes from "./pages/TrailerRoutes";
import TrailerRouteDetail from "./pages/TrailerRouteDetail";
import TrailerExternalMoves from "./pages/TrailerExternalMoves";
import TrailerVehicles from "./pages/TrailerVehicles";
import DriverTrailerAssignments from "./pages/DriverTrailerAssignments";
import TrailerDriverManagement from "./pages/TrailerDriverManagement";
import TrailerReports from "./pages/TrailerReports";
import BookingRequests from "./pages/BookingRequests";
import ServiceZones from "./pages/ServiceZones";
import ClientPortal from "./pages/ClientPortal";
import PortalUnsubscribe from "./pages/PortalUnsubscribe";
import PortalInvites from "./pages/PortalInvites";
import PublicLanding from "./pages/PublicLanding";
import AppLanding from "./pages/AppLanding";
import Inventory from "./pages/Inventory";
import InventoryProducts from "./pages/InventoryProducts";
import InventoryReports from "./pages/InventoryReports";
import Shipments from "./pages/Shipments";

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
import PublicDropoff from "./pages/PublicDropoff";
import PublicServices from "./pages/PublicServices";
import PublicPartners from "./pages/PublicPartners";
import PublicPartnerApply from "./pages/PublicPartnerApply";
import PublicAbout from "./pages/PublicAbout";
import PublicContact from "./pages/PublicContact";
import PublicProducts from "./pages/PublicProducts";
import PartnerApplications from "./pages/PartnerApplications";
import ContactSubmissions from "./pages/ContactSubmissions";
import { FEATURE_FLAGS } from "./lib/featureFlags";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DemoModeProvider>
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
                <ProtectedRoute roles={['admin']}>
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
              <Route path="/michigan-reports" element={
                <ProtectedRoute roles={['admin', 'ops_manager']}>
                  <AppLayout>
                    <MichiganReports />
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
                <ProtectedRoute roles={['admin']}>
                  <AppLayout>
                    <DeploymentDashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/test/notifications" element={
                <ProtectedRoute roles={['admin']}>
                  <AppLayout>
                    <NotificationTest />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/test/manifest-reminders" element={
                <ProtectedRoute roles={['admin']}>
                  <AppLayout>
                    <ManifestRemindersTest />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/data-quality" element={
                <ProtectedRoute roles={['admin']}>
                  <AppLayout>
                    <DataQuality />
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
              
              {/* Catch-all 404 - Must be last */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </DemoModeProvider>
            <AIAssistant />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
