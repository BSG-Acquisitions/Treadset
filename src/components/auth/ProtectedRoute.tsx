import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ('super_admin' | 'admin' | 'ops_manager' | 'dispatcher' | 'driver' | 'sales' | 'client' | 'receptionist' | 'viewer')[];
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  roles = [], 
  requireAuth = true 
}) => {
  const { user, loading, hasAnyRole } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Add delay before redirecting to allow token refresh to complete
  useEffect(() => {
    if (!loading && !user && requireAuth) {
      // Extended delay (500ms) to allow token refresh to complete before redirecting
      const timer = setTimeout(() => setShouldRedirect(true), 500);
      return () => clearTimeout(timer);
    }
    setShouldRedirect(false);
  }, [loading, user, requireAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If auth is not required, always render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Check if user is authenticated - use delayed redirect
  if (!user && shouldRedirect) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  // Still waiting for redirect delay or user exists
  if (!user && !shouldRedirect) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user has required roles
  if (roles.length > 0 && !hasAnyRole(roles)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Your roles: {user?.roles?.join(', ') || 'None'}<br/>
            Required: {roles.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};