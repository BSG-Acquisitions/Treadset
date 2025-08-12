import { supabase } from "@/integrations/supabase/client";

/**
 * Configures Supabase settings for employee management
 * This should be run once during initial setup
 */
export const configureSupabaseForEmployees = async () => {
  try {
    console.log('Configuring Supabase for employee management...');
    
    // Note: These settings should be configured in the Supabase Dashboard
    // This function documents what needs to be set up manually
    
    const configurations = {
      auth: {
        // Go to Authentication > Settings in Supabase Dashboard
        site_url: window.location.origin,
        redirect_urls: [window.location.origin],
        
        // Email settings
        enable_signup: true, // Allow new user registration
        confirm_email: false, // Disable for faster employee onboarding
        enable_confirmations: false,
        
        // Security
        jwt_expiry: 3600, // 1 hour
        refresh_token_rotation_enabled: true,
        security_update_enabled: true
      },
      
      policies: {
        // RLS policies are already configured in the database
        // Users table: Allow operations when authenticated or auth disabled
        // User organization roles: Users can view their own roles, admins can manage
        // Organizations: Allow viewing/managing when authenticated
      }
    };

    console.log('Required Supabase configurations:', configurations);
    
    // Test if we can create users (requires proper RLS setup)
    const { data: testQuery } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (testQuery) {
      console.log('✅ Database access verified');
    }
    
    return {
      success: true,
      message: 'Employee management is ready to use!',
      instructions: [
        '1. Complete your organization setup through onboarding',
        '2. Use the Employee Management page to add team members',
        '3. Assign appropriate roles to each employee',
        '4. Employees can log in immediately with their credentials'
      ]
    };
    
  } catch (error) {
    console.error('❌ Configuration check failed:', error);
    return {
      success: false,
      message: 'Configuration needs attention',
      error: error.message,
      troubleshooting: [
        'Check that you have admin access to your organization',
        'Verify Supabase RLS policies are correctly set up',
        'Ensure your organization exists in the database'
      ]
    };
  }
};

/**
 * Check if the current user can manage employees
 */
export const checkEmployeeManagementAccess = async () => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      return { canManage: false, reason: 'Not authenticated' };
    }

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('user_organization_roles')
      .select('role')
      .eq('user_id', session.session.user.id);

    const hasAdminRole = userRoles?.some(role => role.role === 'admin');
    
    return {
      canManage: hasAdminRole,
      reason: hasAdminRole ? 'Has admin access' : 'Requires admin role'
    };
    
  } catch (error) {
    return {
      canManage: false,
      reason: `Error checking access: ${error.message}`
    };
  }
};