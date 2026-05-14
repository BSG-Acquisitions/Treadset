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

// Resend's webhook signing uses Svix. Verify svix-id + svix-timestamp + raw body
// against the configured RESEND_WEBHOOK_SECRET before doing anything with the payload.
// Reject if the signature is missing, the timestamp is stale (>5 min), or the HMAC
// doesn't match — any of those means we cannot trust the event.
async function verifySvixSignature(
  rawBody: string,
  headers: Headers,
  secret: string
): Promise<{ ok: boolean; reason?: string }> {
  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, reason: 'missing svix headers' };
  }

  const tsSec = Number(svixTimestamp);
  if (!Number.isFinite(tsSec)) return { ok: false, reason: 'bad timestamp' };
  const ageSec = Math.abs(Date.now() / 1000 - tsSec);
  if (ageSec > 5 * 60) return { ok: false, reason: 'timestamp out of range' };

  const secretClean = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(secretClean), (c) => c.charCodeAt(0));
  } catch {
    return { ok: false, reason: 'invalid secret encoding' };
  }

  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(toSign));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  // Header may carry multiple "v1,sig" pairs space-separated during key rotation.
  const passed = svixSignature
    .split(' ')
    .map((s) => s.split(','))
    .some(([version, sig]) => version === 'v1' && constantTimeEqual(sig ?? '', expected));

  return passed ? { ok: true } : { ok: false, reason: 'signature mismatch' };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[RESEND-WEBHOOK] RESEND_WEBHOOK_SECRET not configured — refusing to process unverified payload');
      return new Response(
        JSON.stringify({ error: 'webhook signing secret not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.text();
    const verification = await verifySvixSignature(rawBody, req.headers, webhookSecret);

    if (!verification.ok) {
      console.warn('[RESEND-WEBHOOK] Signature verification failed:', verification.reason);
      return new Response(
        JSON.stringify({ error: 'invalid signature', reason: verification.reason }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let payload: ResendWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as ResendWebhookPayload;
    } catch {
      return new Response(
        JSON.stringify({ error: 'invalid json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
