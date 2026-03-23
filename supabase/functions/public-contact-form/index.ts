import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { validateContactForm, checkRateLimit, getClientIP } from "../_shared/validation.ts";

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
    // Rate limiting - 5 requests per 15 minutes per IP
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(`contact-form:${clientIP}`, 5, 15 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
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
    
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const body = await req.json();
    
    // Validate input using shared validation
    const validation = validateContactForm(body);
    
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

    const { name, email, subject, message, phone } = validation.data!;
    console.log('Processing validated contact form submission');

    // Get the default organization (BSG)
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)
      .single();

    const orgName = orgs?.name || 'TreadSet';

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
        phone: phone || null,
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

    // Send confirmation email to the sender
    try {
      const emailResponse = await resend.emails.send({
        from: "BSG Tire Recycling <noreply@bsgtirerecycling.com>",
        to: [email],
        subject: "We received your message!",
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">Thank You, ${name}!</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>We've received your message and appreciate you reaching out to BSG Tire Recycling.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
                  <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${subject}</p>
                  <p style="margin: 0; color: #666;"><strong>Your message:</strong></p>
                  <p style="margin: 10px 0 0 0; color: #666; font-style: italic;">"${message.slice(0, 200)}${message.length > 200 ? '...' : ''}"</p>
                </div>
                
                <p>Our team will review your inquiry and get back to you as soon as possible, typically within 1-2 business days.</p>
                
                <p style="margin-top: 30px;">Best regards,<br><strong>The BSG Tire Recycling Team</strong></p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                  BSG Tire Recycling<br>
                  2971 Bellevue St, Detroit, MI 48207<br>
                  (313) 744-4139
                </p>
              </div>
            </body>
          </html>
        `,
      });
      console.log("Confirmation email sent successfully:", emailResponse);
    } catch (emailError) {
      // Don't fail the submission if email fails
      console.error("Failed to send confirmation email:", emailError);
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
