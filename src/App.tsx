import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { AIAssistant } from "@/components/AIAssistant";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClientDetail from "./pages/ClientDetail";
import Clients from "./pages/Clients";
import RoutesToday from "./pages/RoutesToday";
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
import ManifestExample from '@/pages/ManifestExample';
import AcroFormDemo from '@/pages/AcroFormDemo';
import ManifestViewer from './pages/ManifestViewer';
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
          <Routes>
            {/* Public Routes - No Authentication Required */}
            <Route path="/public-book" element={<PublicBook />} />
            <Route path="/public-booking-confirmation" element={<PublicBookingConfirmation />} />
          <Route path="/test/manifest" element={
            <div>
              <ManifestExample />
            </div>
          } />
          <Route path="/test/acroform" element={
            <div>
              <AcroFormDemo />
            </div>
          } />
            
            {/* Protected Routes with Layout */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/sign-in" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <Index />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute roles={['admin', 'ops_manager', 'sales']}>
                <AppLayout>
                  <Clients />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/clients/:id" element={
              <ProtectedRoute roles={['admin', 'ops_manager', 'sales']}>
                <AppLayout>
                  <ClientDetail />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/routes/today" element={
              <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
                <AppLayout>
                  <EnhancedRoutesToday />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/routes/legacy" element={
              <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
                <AppLayout>
                  <RoutesToday />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/routes/print/today" element={
              <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
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
              <ProtectedRoute roles={['admin', 'ops_manager', 'sales']}>
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
              <ProtectedRoute roles={['admin', 'ops_manager', 'sales']}>
                <AppLayout>
                  <Dropoffs />
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
              <ProtectedRoute roles={['admin', 'receptionist']}>
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
            
            {/* Trailer Management Routes - Admin/Ops/Dispatcher only (Feature Flag Protected) */}
            {FEATURE_FLAGS.TRAILERS && (
              <>
                <Route path="/trailers" element={
                  <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
                    <AppLayout>
                      <TrailerInventory />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/trailers/routes" element={
                  <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
                    <AppLayout>
                      <TrailerRoutes />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/trailers/routes/:routeId" element={
                  <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
                    <AppLayout>
                      <TrailerRouteDetail />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/trailers/vehicles" element={
                  <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
                    <AppLayout>
                      <TrailerVehicles />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/trailers/external-moves" element={
                  <ProtectedRoute roles={['admin']}>
                    <AppLayout>
                      <TrailerExternalMoves />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/trailers/drivers" element={
                  <ProtectedRoute roles={['admin', 'ops_manager']}>
                    <AppLayout>
                      <TrailerDriverManagement />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                
                {/* Driver Trailer Assignments - Drivers with semi_hauler capability */}
                <Route path="/driver/trailer-assignments" element={
                  <ProtectedRoute roles={['driver', 'admin']}>
                    <AppLayout>
                      <DriverTrailerAssignments />
                    </AppLayout>
                  </ProtectedRoute>
                } />
              </>
            )}
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIAssistant />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
