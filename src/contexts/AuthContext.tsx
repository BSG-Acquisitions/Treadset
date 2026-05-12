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
  signInWithMagicLink: (email: string) => Promise<{ error?: any }>;
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

  const getCookieOrgSlug = (): string | null => {
    if (typeof window === 'undefined') return null;
    const cookies = document.cookie.split(';');
    const orgSlugCookie = cookies.find(cookie => cookie.trim().startsWith('orgSlug='));
    return orgSlugCookie ? orgSlugCookie.split('=')[1] : null;
  };

  const getCurrentOrgSlug = () => getCookieOrgSlug() ?? 'bsg';

  const switchOrganization = (orgSlug: string) => {
    if (typeof window !== 'undefined') {
      document.cookie = `orgSlug=${orgSlug}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
      window.location.reload();
    }
  };

  // Re-entrancy guard for loadUserData. Must be a ref, not state — the
  // onAuthStateChange subscription closes over render-0's value, so a
  // useState flag would always read `false` and never block parallel runs.
  const loadingUserDataRef = useRef(false);

  const loadUserData = async (authUser: User | null) => {
    // Prevent duplicate calls
    if (loadingUserDataRef.current) {
      console.log('loadUserData already in progress, skipping');
      return;
    }

    console.log('loadUserData called with:', authUser?.id);
    loadingUserDataRef.current = true;
    
    try {
      if (!authUser) {
        console.log('No auth user, setting user to null');
        setUserIfChanged(null);
        return;
      }

      const cookieSlug = getCookieOrgSlug();
      console.log('Cookie org slug:', cookieSlug);

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
          default_org_slug,
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
        });
        return;
      }

      if (!userData) {
        console.log('No user data found, no organization assigned');
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
        });
        return;
      }

      console.log('Processing user data...');

      // Preferred slug: explicit cookie wins, otherwise the user's own default, otherwise 'bsg'.
      const preferredSlug = cookieSlug ?? (userData as any).default_org_slug ?? 'bsg';

      let currentOrg = userData.user_organization_roles?.find(
        (uor: any) => uor.organization?.slug === preferredSlug
      )?.organization;

      // If preferred slug doesn't match any membership, fall back to first available
      if (!currentOrg && userData.user_organization_roles?.length > 0) {
        currentOrg = userData.user_organization_roles[0]?.organization;
        console.log('No matching org for preferred slug, using first available:', currentOrg?.slug);
      }

      // Get all roles for current organization (match by ID, not slug)
      const roles = userData.user_organization_roles?.
        filter((uor: any) => uor.organization?.id === currentOrg?.id)
        .map((uor: any) => uor.role) || ['admin'];

      const finalUser: AuthUser = {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        phone: userData.phone,
        signatureDataUrl: userData.signature_data_url,
        roles: roles, // No fallback to admin - empty roles = no access
        ...(currentOrg ? { currentOrganization: currentOrg } : {}),
      };

      console.log('Setting final user:', finalUser);
      setUserIfChanged(finalUser);

    } catch (error) {
      console.error('Error loading user data:', error);
      // Fallback user with no organization — guards must enforce access
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
            roles: [],
          });
        } catch {
          setUserIfChanged({
            id: authUser.id,
            email: authUser.email || '',
            firstName: authUser.user_metadata?.first_name || 'User',
            lastName: authUser.user_metadata?.last_name || '',
            roles: [],
          });
        }
      } else {
        setUserIfChanged(null);
      }
    } finally {
      loadingUserDataRef.current = false;
      // Profile is resolved (success, fallback, or null) — release loading now.
      // Holding loading=true until profile resolves prevents ProtectedRoute's
      // 500ms redirect timer from racing the user-data join on slow mobile
      // networks (the actual cause of "drivers can't log in" complaints —
      // see fix/driver-auth-cold-login-race).
      setLoading(false);
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
          if (session?.user) {
            // loadUserData's finally releases loading once the profile join
            // resolves. DO NOT setLoading(false) here — that's the original
            // race that bounced authenticated drivers back to /auth.
            setTimeout(() => {
              if (mounted) loadUserData(session.user);
            }, 0);
          } else {
            setUserIfChanged(null);
            setLoading(false);
          }
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
        if (!mounted) return;
        setSession(session);
        // Defer user data loading using setTimeout to avoid deadlocks
        setTimeout(() => {
          if (!mounted) return;
          if (!session?.user) {
            setUserIfChanged(null);
            setLoading(false);
            return;
          }
          // TOKEN_REFRESHED fires periodically while signed in. Profile data
          // hasn't changed, so don't re-query or flip loading — that would
          // flicker spinners across the app every refresh window.
          if (event === 'TOKEN_REFRESHED') return;
          // SIGNED_IN / INITIAL_SESSION / USER_UPDATED: hold loading=true
          // until loadUserData resolves the profile.
          setLoading(true);
          loadUserData(session.user);
        }, 0);
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
      // Mobile keyboards (notably iOS) often append a trailing space or
      // auto-capitalize the first letter after autocomplete. Supabase rejects
      // those as "Invalid login credentials" even though the password is right.
      // Kyron, 2026-05-07: same creds worked on Z's device after manual retype.
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
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

  const signInWithMagicLink = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: 'https://app.treadset.co/',
        // Drivers must already have an account; never auto-create from a typo.
        shouldCreateUser: false,
      },
    });
    return error ? { error } : {};
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
        signInWithMagicLink,
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
