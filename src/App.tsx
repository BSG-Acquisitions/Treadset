import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
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
            <Route path="/booking-confirmation" element={
              <ProtectedRoute>
                <BookingConfirmation />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
