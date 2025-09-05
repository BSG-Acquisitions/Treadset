import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  roles?: ('admin' | 'ops_manager' | 'dispatcher' | 'driver' | 'sales' | 'client')[];
}

export const AuthGuard = ({ children, requireAuth = true, roles = [] }: AuthGuardProps) => {
  const { user, loading, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !user) {
      navigate('/auth/sign-in', { 
        replace: true, 
        state: { from: location.pathname } 
      });
      return;
    }

    if (roles.length > 0 && user && !hasAnyRole(roles)) {
      navigate('/', { replace: true });
      return;
    }
  }, [user, loading, requireAuth, roles, navigate, location, hasAnyRole]);

  if (loading) return null;
  if (requireAuth && !user) return null;
  if (roles.length > 0 && user && !hasAnyRole(roles)) return null;

  return <>{children}</>;
};