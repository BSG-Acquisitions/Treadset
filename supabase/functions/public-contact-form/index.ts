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
    console.log('Received contact form submission:', JSON.stringify(body, null, 2));

    // Validate required fields
    const { name, email, subject, message } = body;
    
    if (!name || !email || !subject || !message) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, email, subject, message' }),
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
        JSON.stringify({ error: 'Unable to process submission' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create contact submission record
    const { data: submission, error: submitError } = await supabase
      .from('contact_submissions')
      .insert({
        organization_id: orgs.id,
        name: name,
        email: email,
        phone: body.phone || null,
        subject: subject,
        message: message,
        is_read: false,
      })
      .select()
      .single();

    if (submitError) {
      console.error('Error creating contact submission:', submitError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit message' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Contact submission created successfully:', submission.id);

    // Create a notification for admins
    try {
      await supabase
        .from('notifications')
        .insert({
          organization_id: orgs.id,
          type: 'contact_form',
          title: 'New Contact Form Submission',
          message: `${name} sent a message: "${subject}"`,
          metadata: {
            submission_id: submission.id,
            contact_email: email,
            subject: subject,
          },
          is_read: false,
        });
    } catch (notifError) {
      // Don't fail the submission if notification fails
      console.error('Failed to create notification:', notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Message sent successfully',
        submissionId: submission.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing contact form:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
