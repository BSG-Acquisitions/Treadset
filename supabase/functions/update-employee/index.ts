import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Update employee function called');

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { employeeId, organizationId, email, firstName, lastName, phone, roles, isActive } = body;

    if (!employeeId || !organizationId) {
      throw new Error('Missing required fields: employeeId and organizationId');
    }

    console.log('Updating employee:', employeeId, 'in org:', organizationId);

    // Get caller's internal user id
    const { data: callerUser, error: callerErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (callerErr || !callerUser) throw new Error('Failed to look up caller');

    // Verify caller is admin in this org
    const { data: adminCheck, error: adminErr } = await supabaseAdmin
      .from('user_organization_roles')
      .select('id')
      .eq('user_id', callerUser.id)
      .eq('organization_id', organizationId)
      .in('role', ['admin', 'super_admin']);

    if (adminErr) throw new Error('Database error checking admin role');
    if (!adminCheck || adminCheck.length === 0) {
      throw new Error('Insufficient permissions - admin role required');
    }

    // Get the employee's current data including auth_user_id
    const { data: employee, error: empErr } = await supabaseAdmin
      .from('users')
      .select('id, email, auth_user_id')
      .eq('id', employeeId)
      .single();

    if (empErr || !employee) throw new Error('Employee not found');

    // Build public.users update
    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.is_active = isActive;

    const normalizedEmail = email?.toLowerCase().trim();
    if (normalizedEmail) updateData.email = normalizedEmail;

    // Update public.users
    if (Object.keys(updateData).length > 0) {
      const { error: updateErr } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', employeeId);

      if (updateErr) throw new Error(`Failed to update user: ${updateErr.message}`);
      console.log('Updated public.users');
    }

    // If email changed, update auth.users too
    if (normalizedEmail && normalizedEmail !== employee.email?.toLowerCase()) {
      console.log('Email changed, updating auth.users from', employee.email, 'to', normalizedEmail);
      
      const { error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(
        employee.auth_user_id,
        { email: normalizedEmail, email_confirm: true }
      );

      if (authUpdateErr) {
        // Rollback the public.users email change
        await supabaseAdmin
          .from('users')
          .update({ email: employee.email })
          .eq('id', employeeId);
        
        throw new Error(`Failed to update auth email: ${authUpdateErr.message}`);
      }
      console.log('Updated auth.users email');
    }

    // Update roles if provided
    if (roles && Array.isArray(roles)) {
      // Delete existing roles for this user in this org
      const { error: deleteErr } = await supabaseAdmin
        .from('user_organization_roles')
        .delete()
        .eq('user_id', employeeId)
        .eq('organization_id', organizationId);

      if (deleteErr) throw new Error(`Failed to delete old roles: ${deleteErr.message}`);

      // Insert new roles
      const roleInserts = roles.map((role: string) => ({
        user_id: employeeId,
        organization_id: organizationId,
        role: role as 'admin' | 'ops_manager' | 'dispatcher' | 'driver' | 'sales'
      }));

      const { error: roleErr } = await supabaseAdmin
        .from('user_organization_roles')
        .insert(roleInserts);

      if (roleErr) throw new Error(`Failed to insert new roles: ${roleErr.message}`);
      console.log('Updated roles');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    console.error('Error in update-employee:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
