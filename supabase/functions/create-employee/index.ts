import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Create employee function called');

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create regular client to verify the requesting user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      throw new Error('No authorization header');
    }

    console.log('Auth header found, verifying user...');

    // Verify the user is authenticated and has admin role
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('User verification failed:', userError);
      throw new Error('Unauthorized');
    }

    console.log('Authenticated user:', user.id);

    // Parse request body early to know target organization
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      throw new Error('Invalid JSON in request body');
    }

    const { email, password, firstName, lastName, phone, roles, organizationId } = requestBody;
    const normalizedEmail = email?.toLowerCase().trim();

    console.log('Creating employee with data:', {
      email: normalizedEmail,
      firstName,
      lastName,
      phone,
      roles,
      organizationId
    });

    if (!normalizedEmail || !password || !roles || !organizationId) {
      console.error('Missing required fields:', { email: !!normalizedEmail, password: !!password, roles: !!roles, organizationId: !!organizationId });
      throw new Error('Missing required fields: email, password, roles, and organizationId are required');
    }

    // Resolve current caller's internal user id using admin client (bypasses RLS)
    let { data: callerUser, error: callerLookupError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (callerLookupError) {
      console.error('Error looking up current user record:', callerLookupError);
      throw new Error('Failed to look up current user record');
    }

    let currentUserId = callerUser?.id as string | undefined;

    if (!currentUserId) {
      // Ensure a users row exists for the caller; use upsert to avoid duplicates
      const { data: upserted, error: upsertErr } = await supabaseAdmin
        .from('users')
        .upsert({
          auth_user_id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
          phone: user.user_metadata?.phone || null
        }, { onConflict: 'auth_user_id' })
        .select('id')
        .single();

      if (upsertErr) {
        console.error('Error upserting current user record:', upsertErr);
        throw new Error('Failed to ensure current user record');
      }

      currentUserId = upserted.id;
    }

    console.log('Current user internal id:', currentUserId);

    // Verify caller has admin role in the target organization
    const { data: adminRoleRows, error: adminRoleError } = await supabaseAdmin
      .from('user_organization_roles')
      .select('id')
      .eq('user_id', currentUserId!)
      .eq('organization_id', organizationId)
      .eq('role', 'admin');

    if (adminRoleError) {
      console.error('Role check database error:', adminRoleError);
      throw new Error(`Database error checking roles: ${adminRoleError.message}`);
    }

    if (!adminRoleRows || adminRoleRows.length === 0) {
      console.error('No admin role in target org for user:', currentUserId);
      throw new Error('Insufficient permissions - admin role required in target organization');
    }

    // Check if a user with this email already exists in public.users
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('id, auth_user_id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUserError) {
      console.error('Error checking existing user:', existingUserError);
      throw new Error('Failed to check for existing user');
    }

    if (existingUser) {
      console.log('Found existing user record with email:', normalizedEmail);
      
      // Check if the auth user still exists
      const { data: authUserCheck, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(
        existingUser.auth_user_id
      );

      if (authCheckError || !authUserCheck?.user) {
        // Auth user doesn't exist - this is an orphaned record, clean it up
        console.log('Orphaned user record found, cleaning up...');
        
        // Delete any roles first (foreign key constraint)
        await supabaseAdmin
          .from('user_organization_roles')
          .delete()
          .eq('user_id', existingUser.id);
        
        // Delete the orphaned user record
        const { error: deleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', existingUser.id);

        if (deleteError) {
          console.error('Failed to clean up orphaned user:', deleteError);
          throw new Error('Failed to clean up orphaned user record');
        }
        
        console.log('Orphaned user record cleaned up successfully');
      } else {
        // Auth user exists - this email is already in use
        throw new Error('An employee with this email already exists');
      }
    }

    // Create the auth user using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user');
    }

    console.log('Auth user created:', authData.user.id);

    // Create user record in our users table
    const { data: userData, error: userCreateError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null
      })
      .select()
      .single();

    if (userCreateError) {
      console.error('User table creation error:', userCreateError);
      // Clean up auth user if user table creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw userCreateError;
    }

    console.log('User record created:', userData.id);

    // Assign roles to the user
    const roleInserts = roles.map((role: string) => ({
      user_id: userData.id,
      organization_id: organizationId,
      role: role as 'admin' | 'ops_manager' | 'dispatcher' | 'driver' | 'sales'
    }));

    const { error: roleError2 } = await supabaseAdmin
      .from('user_organization_roles')
      .insert(roleInserts);

    if (roleError2) {
      console.error('Role assignment error:', roleError2);
      // Clean up if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('users').delete().eq('id', userData.id);
      throw roleError2;
    }

    console.log('Roles assigned successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          phone: userData.phone
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in create-employee function:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'An error occurred while creating the employee' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
