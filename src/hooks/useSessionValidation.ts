import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSessionValidation = () => {
  const { user, session } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const validatingRef = useRef(false);

  const validateSession = useCallback(async () => {
    // Prevent concurrent validations
    if (validatingRef.current) {
      console.log('Session validation already in progress');
      return true;
    }
    
    validatingRef.current = true;
    
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
    } finally {
      validatingRef.current = false;
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

    // Only validate if we have a session and user
    // Validate session every 10 minutes (less frequent to reduce load)
    intervalRef.current = setInterval(validateSession, 10 * 60 * 1000);

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