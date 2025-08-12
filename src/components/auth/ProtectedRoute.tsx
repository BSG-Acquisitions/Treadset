import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ('admin' | 'ops_manager' | 'dispatcher' | 'driver' | 'sales')[];
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  roles = [], 
  requireAuth = true 
}) => {
  const { user, loading, hasAnyRole } = useAuth();

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

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has required roles
  if (roles.length > 0 && !hasAnyRole(roles)) {
    console.log('Access denied - User roles:', user?.roles, 'Required roles:', roles);
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