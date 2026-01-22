import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // For bounce/complaint events
    bounce?: {
      message: string;
    };
    // For click events
    click?: {
      link: string;
      timestamp: string;
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ResendWebhookPayload = await req.json();
    console.log('[RESEND-WEBHOOK] Received event:', payload.type, 'for email:', payload.data.email_id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const eventType = payload.type;
    const emailId = payload.data.email_id;
    const recipientEmail = payload.data.to?.[0];
    const timestamp = payload.created_at;

    // Map Resend event types to our internal types
    let internalEventType: string;
    const eventMetadata: Record<string, unknown> = {};

    switch (eventType) {
      case 'email.sent':
        internalEventType = 'sent';
        break;
      case 'email.delivered':
        internalEventType = 'delivered';
        break;
      case 'email.opened':
        internalEventType = 'open';
        break;
      case 'email.clicked':
        internalEventType = 'click';
        eventMetadata.link = payload.data.click?.link;
        break;
      case 'email.bounced':
        internalEventType = 'bounce';
        eventMetadata.bounce_message = payload.data.bounce?.message;
        break;
      case 'email.complained':
        internalEventType = 'complaint';
        break;
      default:
        console.log('[RESEND-WEBHOOK] Unknown event type:', eventType);
        return new Response(
          JSON.stringify({ received: true, skipped: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Log event to email_events table (using event_type column)
    const { error: insertError } = await supabase
      .from('email_events')
      .insert({
        event_type: internalEventType,
        metadata: {
          resend_email_id: emailId,
          recipient_email: recipientEmail,
          subject: payload.data.subject,
          from: payload.data.from,
          ...eventMetadata,
        },
        created_at: timestamp,
      });

    if (insertError) {
      console.error('[RESEND-WEBHOOK] Error inserting email event:', insertError);
    }

    // For bounces, also log to email_bounces table
    if (internalEventType === 'bounce' || internalEventType === 'complaint') {
      const { error: bounceError } = await supabase
        .from('email_bounces')
        .upsert({
          email: recipientEmail,
          bounce_type: internalEventType,
          bounce_reason: (eventMetadata.bounce_message as string) || 'No reason provided',
          resend_email_id: emailId,
          bounced_at: timestamp,
        }, {
          onConflict: 'email',
          ignoreDuplicates: false,
        });

      if (bounceError) {
        console.error('[RESEND-WEBHOOK] Error inserting bounce record:', bounceError);
      }
    }

    // Try to find and update client_invites if this email was a portal invite
    // Look for invites by checking the metadata for matching resend_message_id
    // For now, we'll update based on email match since resend_message_id might not exist
    if (recipientEmail) {
      const { data: invite } = await supabase
        .from('client_invites')
        .select('id')
        .eq('sent_to_email', recipientEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invite) {
        const updateData: Record<string, unknown> = {};
        
        if (internalEventType === 'open') {
          updateData.opened_at = timestamp;
        } else if (internalEventType === 'click') {
          updateData.clicked_at = timestamp;
        }

        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('client_invites')
            .update(updateData)
            .eq('id', invite.id);
        }
      }
    }

    // Update email_preferences if we can match by email
    if (recipientEmail && (internalEventType === 'open' || internalEventType === 'click')) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('email', recipientEmail)
        .maybeSingle();

      if (client) {
        const { data: prefs } = await supabase
          .from('client_email_preferences')
          .select('id, emails_clicked')
          .eq('client_id', client.id)
          .maybeSingle();

        if (prefs && internalEventType === 'click') {
          await supabase
            .from('client_email_preferences')
            .update({
              emails_clicked: (prefs.emails_clicked || 0) + 1,
            })
            .eq('id', prefs.id);
        }
      }
    }

    console.log('[RESEND-WEBHOOK] Successfully processed event:', internalEventType);

    return new Response(
      JSON.stringify({ received: true, event_type: internalEventType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RESEND-WEBHOOK] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
