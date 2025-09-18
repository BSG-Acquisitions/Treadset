import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSessionValidation = () => {
  const { user, session } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const validateSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      // Enhanced session validation
      if (error || !data.session) {
        console.warn('Session validation failed:', error);
        await supabase.auth.signOut();
        return false;
      }

      // Check if session is expired
      const now = Math.floor(Date.now() / 1000);
      if (data.session.expires_at && data.session.expires_at < now) {
        console.warn('Session expired');
        await supabase.auth.signOut();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!session) {
      // Clear interval when no session
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial validation
    validateSession();

    // Validate session every 5 minutes with enhanced error handling
    intervalRef.current = setInterval(validateSession, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session, validateSession]);

  return { 
    isAuthenticated: !!user && !!session,
    validateSession 
  };
};