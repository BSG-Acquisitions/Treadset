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

    // Check if user has admin role in their organization
    // First try to find existing user record
    let { data: userRecord, error: userRecordError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    // If user record doesn't exist, create it (this handles cases where user was authenticated but doesn't have a user record)
    if (userRecordError && userRecordError.code === 'PGRST116') {
      console.log('User record not found, creating it...');
      const { data: newUserRecord, error: createUserError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
          phone: user.user_metadata?.phone || null
        })
        .select()
        .single();

      if (createUserError) {
        console.error('Error creating user record:', createUserError);
        throw new Error('Failed to create user record');
      }

      userRecord = newUserRecord;
    } else if (userRecordError) {
      console.error('Error finding user record:', userRecordError);
      throw new Error('Database error finding user');
    }

    console.log('User record found/created:', userRecord.id);

    // Use admin client for role check since RLS is strict now
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_organization_roles')
      .select('role, organization_id')
      .eq('user_id', userRecord.id)
      .eq('role', 'admin');

    console.log('Role query result:', { userRoles, roleError });

    if (roleError) {
      console.error('Role check database error:', roleError);
      throw new Error(`Database error checking roles: ${roleError.message}`);
    }

    if (!userRoles || userRoles.length === 0) {
      console.error('No admin role found for user:', userRecord.id);
      throw new Error('Insufficient permissions - admin role required');
    }

    console.log('Admin role verified for user:', userRecord.id);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      throw new Error('Invalid JSON in request body');
    }

    const { email, password, firstName, lastName, phone, roles, organizationId } = requestBody;

    console.log('Creating employee with data:', {
      email,
      firstName,
      lastName,
      phone,
      roles,
      organizationId
    });

    if (!email || !password || !roles || !organizationId) {
      console.error('Missing required fields:', { email: !!email, password: !!password, roles: !!roles, organizationId: !!organizationId });
      throw new Error('Missing required fields: email, password, roles, and organizationId are required');
    }

    console.log('Creating employee with data:', {
      email,
      firstName,
      lastName,
      phone,
      roles,
      organizationId
    });

    // Create the auth user using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
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
        email,
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

  } catch (error) {
    console.error('Error in create-employee function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while creating the employee' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});