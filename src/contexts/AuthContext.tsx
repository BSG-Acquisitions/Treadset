import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'ops_manager' | 'dispatcher' | 'driver' | 'sales' | 'client';

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

  const loadUserData = async (authUser: User | null) => {
    console.log('loadUserData called with:', authUser?.id);
    
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
          id: '00000000-0000-0000-0000-000000000000', // Valid UUID for demo
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
      
      try {
        // Get user from our custom users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            phone,
            user_organization_roles (
              role,
              organization:organizations (
                id,
                name,
                slug
              )
            )
          `)
          .eq('auth_user_id', authUser.id)
          .single();

        console.log('User data query result:', { userData, userError });

        if (userError) {
          console.error('Error loading user data:', userError);
          setUser(null);
          return;
        }

        console.log('Processing user data...');

        // Find current organization
        const currentOrg = userData.user_organization_roles.find(
          (uor: any) => uor.organization.slug === orgSlug
        )?.organization;

        console.log('Current org found:', currentOrg);
        console.log('Looking for org slug:', orgSlug);
        console.log('Available orgs:', userData.user_organization_roles.map((uor: any) => uor.organization));

        // Get all roles for current organization
        const roles = userData.user_organization_roles
          .filter((uor: any) => uor.organization.slug === orgSlug)
          .map((uor: any) => uor.role);

        console.log('User roles:', roles);

        const finalUser = {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          phone: userData.phone,
          roles,
          currentOrganization: currentOrg
        };

        console.log('Setting final user:', finalUser);
        setUser(finalUser);
      } catch (queryError) {
        console.error('Caught error during user data query:', queryError);
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUser(null);
    } finally {
      // Always ensure loading is cleared
      console.log('loadUserData completed, clearing loading state');
    }
  };

  useEffect(() => {
    let mounted = true;

    // Fallback timeout to clear loading if something goes wrong
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.log('Loading timeout reached, forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    const initAuth = async () => {
      try {
        // Check for existing session first
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', session?.user?.id, error);
        
        if (mounted) {
          setSession(session);
          try {
            await loadUserData(session?.user ?? null);
            console.log('loadUserData completed successfully');
          } catch (error) {
            console.error('Error in initial session load:', error);
            setUser(null);
          }
          console.log('Setting loading to false');
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          console.log('Setting loading to false due to error');
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        if (mounted) {
          setSession(session);
          try {
            await loadUserData(session?.user ?? null);
          } catch (error) {
            console.error('Error in auth state change handler:', error);
            setUser(null);
          }
          // Don't set loading false here - only on initial load
        }
      }
    );

    // Initialize auth
    initAuth();

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('signIn called with email:', email);
    
    if (DISABLE_AUTH) {
      // Demo mode - always succeed
      await loadUserData(null);
      return {};
    }

    console.log('Attempting to sign in with Supabase...');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('Sign in result:', { error });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    if (DISABLE_AUTH) {
      // Demo mode - always succeed
      await loadUserData(null);
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