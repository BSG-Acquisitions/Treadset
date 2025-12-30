import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Received partner application:', JSON.stringify(body, null, 2));

    // Validate required fields
    const { companyName, contactName, email, phone, dotNumber } = body;
    
    if (!companyName || !contactName || !email || !phone || !dotNumber) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: companyName, contactName, email, phone, dotNumber' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the default organization (BSG)
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (orgError || !orgs) {
      console.error('Error fetching organization:', orgError);
      return new Response(
        JSON.stringify({ error: 'Unable to process application' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create hauler application record
    const { data: hauler, error: haulerError } = await supabase
      .from('haulers')
      .insert({
        organization_id: orgs.id,
        company_name: companyName,
        contact_name: contactName,
        email: email,
        phone: phone,
        dot_number: dotNumber,
        mc_number: body.mcNumber || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || 'MI',
        zip: body.zip || null,
        notes: `Fleet size: ${body.fleetSize || 'Not specified'}\n\nAdditional notes: ${body.notes || 'None'}`,
        status: 'pending',
        is_active: false, // Not active until approved
      })
      .select()
      .single();

    if (haulerError) {
      console.error('Error creating hauler record:', haulerError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit application' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Partner application created successfully:', hauler.id);

    // Create a notification for admins
    try {
      await supabase
        .from('notifications')
        .insert({
          organization_id: orgs.id,
          type: 'partner_application',
          title: 'New Partner Application',
          message: `${companyName} has applied to become a transport partner. DOT: ${dotNumber}`,
          metadata: {
            hauler_id: hauler.id,
            company_name: companyName,
            contact_email: email,
          },
          is_read: false,
        });
    } catch (notifError) {
      // Don't fail the application if notification fails
      console.error('Failed to create notification:', notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Application submitted successfully',
        applicationId: hauler.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing partner application:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
