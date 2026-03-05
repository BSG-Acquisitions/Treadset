import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type AppRole = 'super_admin' | 'admin' | 'ops_manager' | 'dispatcher' | 'driver' | 'sales' | 'client' | 'hauler' | 'receptionist' | 'viewer';

export type { AppRole };

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles: AppRole[];
  signatureDataUrl?: string;
  currentOrganization?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: any }>;
  updatePassword: (password: string) => Promise<{ error?: any }>;
  switchOrganization: (orgSlug: string) => void;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  getCurrentOrgSlug: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const validatingRef = useRef(false);
  const hasCheckedOnboarding = useRef(false);
  const lastUserJson = useRef<string | null>(null);

  // Prevent unnecessary re-renders by comparing user state
  const setUserIfChanged = (newUser: AuthUser | null) => {
    const newJson = newUser ? JSON.stringify(newUser) : null;
    if (lastUserJson.current !== newJson) {
      lastUserJson.current = newJson;
      setUser(newUser);
    }
  };

  // Session validation to prevent auth expiry
  const validateSession = useCallback(async () => {
    if (validatingRef.current) return true;
    
    validatingRef.current = true;
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        console.warn('Session validation failed:', error);
        await supabase.auth.signOut();
        return false;
      }

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

  const getCurrentOrgSlug = () => {
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split(';');
      const orgSlugCookie = cookies.find(cookie => cookie.trim().startsWith('orgSlug='));
      if (orgSlugCookie) {
        return orgSlugCookie.split('=')[1];
      }
    }
    return 'bsg'; // Default to BSG
  };

  const switchOrganization = (orgSlug: string) => {
    if (typeof window !== 'undefined') {
      document.cookie = `orgSlug=${orgSlug}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
      window.location.reload();
    }
  };

  // Flag to prevent duplicate user data loading
  const [loadingUserData, setLoadingUserData] = useState(false);

  const loadUserData = async (authUser: User | null) => {
    // Prevent duplicate calls
    if (loadingUserData) {
      console.log('loadUserData already in progress, skipping');
      return;
    }

    console.log('loadUserData called with:', authUser?.id);
    setLoadingUserData(true);
    
    try {
      if (!authUser) {
        console.log('No auth user, setting user to null');
        setUserIfChanged(null);
        return;
      }

      const orgSlug = getCurrentOrgSlug();
      console.log('Current org slug:', orgSlug);

      console.log('Fetching user data for auth user:', authUser.id);
      
      // Simplified query without timeout race condition
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone,
          signature_data_url,
          user_organization_roles!inner (
            role,
            organization:organizations!inner (
              id,
              name,
              slug
            )
          )
        `)
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      console.log('User data query result:', { userData: !!userData, userError });

      if (userError) {
        console.error('Error loading user data:', userError);
        // Look up real internal users.id before falling back to auth UUID
        const { data: basicUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();
        setUserIfChanged({
          id: basicUser?.id || authUser.id,
          email: authUser.email || '',
          firstName: authUser.user_metadata?.first_name || 'User',
          lastName: authUser.user_metadata?.last_name || '',
          roles: [],
          currentOrganization: {
            id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
            name: 'BSG Logistics',
            slug: 'bsg'
          }
        });
        return;
      }

      if (!userData) {
        console.log('No user data found, providing fallback');
        // Look up real internal users.id before falling back to auth UUID
        const { data: basicUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();
        setUserIfChanged({
          id: basicUser?.id || authUser.id,
          email: authUser.email || '',
          firstName: authUser.user_metadata?.first_name || 'User',
          lastName: authUser.user_metadata?.last_name || '',
          roles: [],
          currentOrganization: {
            id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
            name: 'BSG Logistics',
            slug: 'bsg'
          }
        });
        return;
      }

      console.log('Processing user data...');

      // Find current organization by cookie slug
      let currentOrg = userData.user_organization_roles?.find(
        (uor: any) => uor.organization?.slug === orgSlug
      )?.organization;

      // If cookie slug doesn't match, use user's first available org
      if (!currentOrg && userData.user_organization_roles?.length > 0) {
        currentOrg = userData.user_organization_roles[0]?.organization;
        console.log('No matching org for cookie slug, using first available:', currentOrg?.slug);
      }

      // Get all roles for current organization (match by ID, not slug)
      const roles = userData.user_organization_roles?.
        filter((uor: any) => uor.organization?.id === currentOrg?.id)
        .map((uor: any) => uor.role) || ['admin'];

      const finalUser = {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        phone: userData.phone,
        signatureDataUrl: userData.signature_data_url,
        roles: roles, // No fallback to admin - empty roles = no access
        currentOrganization: currentOrg || {
          id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
          name: 'BSG Logistics',
          slug: 'bsg'
        }
      };

      console.log('Setting final user:', finalUser);
      setUserIfChanged(finalUser);

    } catch (error) {
      console.error('Error loading user data:', error);
      // Provide fallback user — look up real internal users.id first
      if (authUser) {
        try {
          const { data: basicUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', authUser.id)
            .maybeSingle();
          setUserIfChanged({
            id: basicUser?.id || authUser.id,
            email: authUser.email || '',
            firstName: authUser.user_metadata?.first_name || 'User',
            lastName: authUser.user_metadata?.last_name || '',
            roles: ['admin'],
            currentOrganization: {
              id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
              name: 'BSG Logistics',
              slug: 'bsg'
            }
          });
        } catch {
          setUserIfChanged({
            id: authUser.id,
            email: authUser.email || '',
            firstName: authUser.user_metadata?.first_name || 'User',
            lastName: authUser.user_metadata?.last_name || '',
            roles: ['admin'],
            currentOrganization: {
              id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
              name: 'BSG Logistics',
              slug: 'bsg'
            }
          });
        }
      } else {
        setUserIfChanged(null);
      }
    } finally {
      setLoadingUserData(false);
      console.log('loadUserData completed');
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        // Check for existing session first
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', session?.user?.id, error);
        
        if (mounted) {
          setSession(session);
          // Defer user data loading to avoid blocking
          if (session?.user) {
            setTimeout(() => {
              if (mounted) loadUserData(session.user);
            }, 0);
          } else {
            setUserIfChanged(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        if (mounted) {
          setSession(session);
          // Defer user data loading using setTimeout to avoid deadlocks
          setTimeout(() => {
            if (mounted) {
              if (session?.user) {
                loadUserData(session.user);
              } else {
                setUserIfChanged(null);
              }
            }
          }, 0);
        }
      }
    );

    // Initialize auth
    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Check if user needs onboarding - only once per session
  useEffect(() => {
    const checkOnboarding = async () => {
      // Skip if already checked, not ready, or no user
      if (hasCheckedOnboarding.current || loading || !user?.id) return;
      hasCheckedOnboarding.current = true;

      try {
        // Check if user has an organization with a real name (not placeholder)
        const { data: orgData } = await supabase
          .from('user_organization_roles')
          .select('organization_id, organizations(name)')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        // If org name is still "New Company", redirect to onboarding using SPA navigation
        if (orgData?.organizations?.name === 'New Company') {
          const currentPath = window.location.pathname;
          if (currentPath !== '/onboarding' && currentPath !== '/auth') {
            // Use history API for SPA navigation instead of full page reload
            window.history.pushState(null, '', '/onboarding');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboarding();
  }, [user?.id, loading]);

  const signIn = async (email: string, password: string) => {
    console.log('signIn called with email:', email);

    console.log('Attempting to sign in with Supabase...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Supabase auth result:', { data: !!data, error });
      
      if (error) {
        return { error };
      }
      
      // The auth state change handler will call loadUserData via setTimeout
      console.log('Auth successful, user data will be loaded by state handler');
      return {};
      
    } catch (authError) {
      console.error('Auth error caught:', authError);
      return { error: authError };
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const redirectUrl = 'https://app.treadset.co/';
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    // Create user record if auth signup succeeded
    if (!error && data.user) {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: data.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
        });

      if (userError) {
        console.error('Error creating user record:', userError);
      }
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    // Hardcode production URL to prevent preview/dev environment issues
    const productionUrl = 'https://app.treadset.co';
    const resetUrl = `${productionUrl}/reset-password`;
    
    console.log('Password reset redirect URL:', resetUrl);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl
    });
    
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const hasRole = (role: AppRole) => {
    return user?.roles.includes(role) ?? false;
  };

  const hasAnyRole = (roles: AppRole[]) => {
    return roles.some(role => user?.roles.includes(role)) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        switchOrganization,
        hasRole,
        hasAnyRole,
        getCurrentOrgSlug,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
