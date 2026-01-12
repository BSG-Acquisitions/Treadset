import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validatePartnerApplication, checkRateLimit, getClientIP } from "../_shared/validation.ts";

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
    // Rate limiting - 3 applications per hour per IP
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(`partner-app:${clientIP}`, 3, 60 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many applications. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000))
          }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    
    // Validate input using shared validation
    const validation = validatePartnerApplication(body);
    
    if (!validation.success) {
      console.error('Validation failed:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { companyName, contactName, email, phone, dotNumber, mcNumber, address, city, state, zip, fleetSize, notes } = validation.data!;
    console.log('Processing validated partner application');

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
        hauler_name: companyName,
        company_name: companyName,
        contact_name: contactName,
        email: email,
        phone: phone,
        dot_number: dotNumber,
        mc_number: mcNumber || null,
        address: address || null,
        city: city || null,
        state: state || 'MI',
        zip: zip || null,
        notes: `Fleet size: ${fleetSize || 'Not specified'}\n\nAdditional notes: ${notes || 'None'}`,
        status: 'pending',
        application_status: 'pending',
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
