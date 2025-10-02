import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'ops_manager' | 'dispatcher' | 'driver' | 'sales' | 'client' | 'hauler';

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles: AppRole[];
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

const DISABLE_AUTH = false; // Set to true to bypass auth for demo

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (!authUser && !DISABLE_AUTH) {
        console.log('No auth user, setting user to null');
        setUser(null);
        return;
      }

      const orgSlug = getCurrentOrgSlug();
      console.log('Current org slug:', orgSlug);
      
      if (DISABLE_AUTH) {
        // Demo mode - create a mock admin user with real organization
        setUser({
          id: '00000000-0000-0000-0000-000000000000',
          email: 'admin@bsg.com',
          firstName: 'Demo',
          lastName: 'Admin',
          roles: ['admin'],
          currentOrganization: {
            id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
            name: 'BSG Logistics',
            slug: 'bsg'
          }
        });
        return;
      }

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
        // Provide fallback user with admin role
        setUser({
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
        return;
      }

      if (!userData) {
        console.log('No user data found, providing fallback');
        setUser({
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
        return;
      }

      console.log('Processing user data...');

      // Find current organization
      const currentOrg = userData.user_organization_roles?.find(
        (uor: any) => uor.organization?.slug === orgSlug
      )?.organization;

      // Get all roles for current organization
      const roles = userData.user_organization_roles?.
        filter((uor: any) => uor.organization?.slug === orgSlug)
        .map((uor: any) => uor.role) || ['admin'];

      const finalUser = {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        phone: userData.phone,
        roles: roles.length > 0 ? roles : ['admin'], // Ensure at least one role
        currentOrganization: currentOrg || {
          id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
          name: 'BSG Logistics',
          slug: 'bsg'
        }
      };

      console.log('Setting final user:', finalUser);
      setUser(finalUser);

    } catch (error) {
      console.error('Error loading user data:', error);
      // Provide fallback user
      if (authUser) {
        setUser({
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
      } else {
        setUser(null);
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
            setUser(null);
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
                setUser(null);
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
    };
  }, []);

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user?.id || loading) return;

      try {
        // Check if user has an organization with a real name (not placeholder)
        const { data: orgData } = await supabase
          .from('user_organization_roles')
          .select('organization_id, organizations(name)')
          .eq('user_id', user.id)
          .single();

        // If org name is still "New Company", redirect to onboarding
        if (orgData?.organizations?.name === 'New Company') {
          const currentPath = window.location.pathname;
          if (currentPath !== '/onboarding' && currentPath !== '/auth') {
            window.location.href = '/onboarding';
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboarding();
  }, [user, loading]);

  const signIn = async (email: string, password: string) => {
    console.log('signIn called with email:', email);
    
    if (DISABLE_AUTH) {
      // Demo mode - always succeed
      setTimeout(() => loadUserData(null), 0);
      return {};
    }

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
    if (DISABLE_AUTH) {
      // Demo mode - always succeed
      setTimeout(() => loadUserData(null), 0);
      return {};
    }

    const redirectUrl = `${window.location.origin}/`;
    
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
    if (DISABLE_AUTH) {
      setUser(null);
      setSession(null);
      return;
    }

    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    if (DISABLE_AUTH) {
      return {};
    }

    // Get the current domain/URL for the redirect
    const currentUrl = window.location.origin;
    const redirectUrl = `${currentUrl}/reset-password`;
    
    console.log('Password reset redirect URL:', redirectUrl);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    if (DISABLE_AUTH) {
      return {};
    }

    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const hasRole = (role: AppRole) => {
    if (DISABLE_AUTH) return true;
    return user?.roles.includes(role) ?? false;
  };

  const hasAnyRole = (roles: AppRole[]) => {
    if (DISABLE_AUTH) return true;
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