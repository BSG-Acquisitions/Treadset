import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClientDetail from "./pages/ClientDetail";
import Clients from "./pages/Clients";
import RoutesToday from "./pages/RoutesToday";
import RoutesPrintToday from "./pages/RoutesPrintToday";
import Book from "./pages/Book";
import BookingConfirmation from "./pages/BookingConfirmation";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Employees from "./pages/Employees";
import ClientAnalytics from "./pages/ClientAnalytics";
import Settings from "./pages/Settings";
import EnhancedRoutesToday from "./pages/EnhancedRoutesToday";
import PricingAdmin from "./pages/PricingAdmin";
import Integrations from "./pages/Integrations";
import DriverManifests from "./pages/DriverManifests";
import DriverManifestCreate from "./pages/DriverManifestCreate";
import DriverManifestView from "./pages/DriverManifestView";
import DriverRoutes from "./pages/DriverRoutes";
import DriverDashboard from "./pages/DriverDashboard";
import PublicBook from "./pages/PublicBook";
import PublicBookingConfirmation from "./pages/PublicBookingConfirmation";

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
            
            {/* Protected Routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={
              <ProtectedRoute roles={['admin']}>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute roles={['admin', 'ops_manager', 'sales']}>
                <Clients />
              </ProtectedRoute>
            } />
            <Route path="/clients/:id" element={
              <ProtectedRoute roles={['admin', 'ops_manager', 'sales']}>
                <ClientDetail />
              </ProtectedRoute>
            } />
            <Route path="/routes/today" element={
              <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'driver']}>
                <EnhancedRoutesToday />
              </ProtectedRoute>
            } />
            <Route path="/routes/legacy" element={
              <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher', 'driver']}>
                <RoutesToday />
              </ProtectedRoute>
            } />
            <Route path="/routes/print/today" element={
              <ProtectedRoute roles={['admin', 'ops_manager', 'dispatcher']}>
                <RoutesPrintToday />
              </ProtectedRoute>
            } />
            <Route path="/book" element={
              <ProtectedRoute roles={['admin', 'ops_manager', 'sales']}>
                <Book />
              </ProtectedRoute>
            } />
            <Route path="/employees" element={
              <ProtectedRoute roles={['admin']}>
                <Employees />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute roles={['admin', 'ops_manager']}>
                <ClientAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/pricing" element={
              <ProtectedRoute roles={['admin', 'ops_manager']}>
                <PricingAdmin />
              </ProtectedRoute>
            } />
            <Route path="/booking-confirmation" element={
              <ProtectedRoute>
                <BookingConfirmation />
              </ProtectedRoute>
            } />
            <Route path="/integrations" element={
              <ProtectedRoute roles={['admin']}>
                <Integrations />
              </ProtectedRoute>
            } />
            <Route path="/driver/manifests" element={
              <ProtectedRoute roles={['driver', 'admin']}>
                <DriverManifests />
              </ProtectedRoute>
            } />
            <Route path="/driver/manifest/new" element={
              <ProtectedRoute roles={['driver', 'admin']}>
                <DriverManifestCreate />
              </ProtectedRoute>
            } />
            <Route path="/driver/manifest/:id" element={
              <ProtectedRoute roles={['driver', 'admin']}>
                <DriverManifestView />
              </ProtectedRoute>
            } />
            <Route path="/routes/driver" element={
              <ProtectedRoute roles={['driver', 'admin']}>
                <DriverRoutes />
              </ProtectedRoute>
            } />
            <Route path="/driver/dashboard" element={
              <ProtectedRoute roles={['driver', 'admin']}>
                <DriverDashboard />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
