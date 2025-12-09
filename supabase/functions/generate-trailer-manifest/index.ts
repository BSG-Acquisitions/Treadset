import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { encode as b64encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrailerManifestRequest {
  event_id: string;
  organization_id: string;
  send_email?: boolean;
  recipient_email?: string;
  recipient_name?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: TrailerManifestRequest = await req.json();
    const { event_id, organization_id, send_email = false, recipient_email, recipient_name } = body;

    if (!event_id || !organization_id) {
      throw new Error('Missing required fields: event_id, organization_id');
    }

    console.log(`[TrailerManifest] Generating manifest for event: ${event_id}, send_email: ${send_email}`);

    // Fetch event details with related data
    const { data: event, error: eventError } = await supabase
      .from('trailer_events')
      .select(`
        *,
        trailer:trailers(trailer_number, notes),
        driver:users(first_name, last_name, email)
      `)
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      throw new Error(`Event not found: ${eventError?.message}`);
    }

    // Generate manifest number if not already present
    let manifestNumber = event.manifest_number;
    if (!manifestNumber) {
      const { data: newManifestNumber, error: mnError } = await supabase
        .rpc('generate_trailer_manifest_number', { org_id: organization_id });

      if (mnError) {
        throw new Error(`Failed to generate manifest number: ${mnError.message}`);
      }
      manifestNumber = newManifestNumber;
    }

    console.log(`[TrailerManifest] Manifest number: ${manifestNumber}`);

    // Get organization info
    const { data: org } = await supabase
      .from('organizations')
      .select('name, logo_url')
      .eq('id', organization_id)
      .single();

    // Get signature data URL if exists
    let signatureDataUrl = '';
    if (event.signature_path) {
      const { data: signatureData } = await supabase.storage
        .from('manifests')
        .createSignedUrl(event.signature_path, 3600);
      signatureDataUrl = signatureData?.signedUrl || '';
    }

    // Build HTML for PDF
    const eventDate = new Date(event.timestamp);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const eventTypeLabels: Record<string, string> = {
      pickup_empty: 'Empty Trailer Pickup',
      drop_empty: 'Empty Trailer Drop-off',
      pickup_full: 'Full Trailer Pickup',
      drop_full: 'Full Trailer Drop-off',
      swap: 'Trailer Swap',
      stage_empty: 'Empty Trailer Staging',
      external_pickup: 'External Pickup',
      external_drop: 'External Drop-off',
      waiting_unload: 'Waiting to Unload',
    };

    const driverName = event.driver 
      ? `${event.driver.first_name || ''} ${event.driver.last_name || ''}`.trim() 
      : 'Unknown Driver';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0.5in; size: letter; }
    * { box-sizing: border-box; }
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      margin: 0; 
      padding: 30px;
      color: #333; 
      background: #fff;
      font-size: 12px;
      line-height: 1.4;
    }
    .header { 
      text-align: center; 
      margin-bottom: 25px; 
      border-bottom: 3px solid #1A4314; 
      padding-bottom: 15px; 
    }
    .header h1 { 
      color: #1A4314; 
      margin: 0 0 5px 0; 
      font-size: 22px;
      letter-spacing: 0.5px;
    }
    .header .subtitle {
      color: #666;
      font-size: 11px;
      margin: 0;
    }
    .manifest-number { 
      font-size: 16px; 
      color: #1A4314;
      font-weight: bold;
      margin-top: 8px;
    }
    .section { margin-bottom: 20px; }
    .section-title { 
      font-size: 11px; 
      font-weight: bold; 
      color: #1A4314; 
      text-transform: uppercase; 
      margin-bottom: 10px; 
      border-bottom: 1px solid #ccc; 
      padding-bottom: 5px;
      letter-spacing: 0.5px;
    }
    .info-grid { 
      display: table;
      width: 100%;
    }
    .info-row {
      display: table-row;
    }
    .info-item { 
      display: table-cell;
      padding: 8px 10px;
      width: 50%;
      vertical-align: top;
    }
    .info-label { 
      font-size: 10px; 
      color: #666; 
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .info-value { 
      font-size: 13px; 
      font-weight: 500;
      color: #222;
    }
    .event-badge { 
      background: #1A4314; 
      color: white; 
      padding: 6px 14px; 
      display: inline-block; 
      border-radius: 4px; 
      font-weight: bold;
      font-size: 12px;
    }
    .signature-section {
      margin-top: 25px;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 15px;
      background: #fafafa;
    }
    .signature-box { 
      border: 1px solid #ccc; 
      padding: 10px; 
      margin-top: 10px;
      background: white;
      min-height: 80px;
      border-radius: 4px;
    }
    .signature-box img { 
      max-height: 70px;
      max-width: 100%;
    }
    .signature-info {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      font-size: 11px;
      color: #666;
    }
    .footer { 
      margin-top: 30px; 
      padding-top: 15px; 
      border-top: 1px solid #ddd; 
      font-size: 9px; 
      color: #888; 
      text-align: center; 
    }
    .notes-box { 
      background: #f5f5f5; 
      padding: 12px; 
      border-radius: 4px;
      border-left: 3px solid #1A4314;
      font-style: italic;
      color: #555;
    }
    .compliance {
      background: #e8f5e9;
      border: 1px solid #c8e6c9;
      border-radius: 4px;
      padding: 10px;
      font-size: 10px;
      color: #2e7d32;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${org?.name || 'BSG Tire Recycling'}</h1>
    <p class="subtitle">Trailer Move Manifest</p>
    <div class="manifest-number">${manifestNumber}</div>
  </div>

  <div class="section">
    <div class="section-title">Event Details</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-item">
          <div class="info-label">Event Type</div>
          <div class="info-value"><span class="event-badge">${eventTypeLabels[event.event_type] || event.event_type}</span></div>
        </div>
        <div class="info-item">
          <div class="info-label">Date</div>
          <div class="info-value">${formattedDate}</div>
        </div>
      </div>
      <div class="info-row">
        <div class="info-item">
          <div class="info-label">Time</div>
          <div class="info-value">${formattedTime}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Location</div>
          <div class="info-value">${event.location_name || 'N/A'}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Trailer Information</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-item">
          <div class="info-label">Trailer Number</div>
          <div class="info-value" style="font-size: 16px; font-weight: bold;">${event.trailer?.trailer_number || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Trailer Notes</div>
          <div class="info-value">${event.trailer?.notes || 'None'}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Driver Information</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-item">
          <div class="info-label">Driver Name</div>
          <div class="info-value">${driverName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Driver Email</div>
          <div class="info-value">${event.driver?.email || 'N/A'}</div>
        </div>
      </div>
    </div>
  </div>

  ${event.location_contact_name || recipient_name ? `
  <div class="section">
    <div class="section-title">Location Contact</div>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-item">
          <div class="info-label">Contact Name</div>
          <div class="info-value">${event.location_contact_name || recipient_name || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Contact Email</div>
          <div class="info-value">${event.location_contact_email || recipient_email || 'N/A'}</div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  ${event.notes ? `
  <div class="section">
    <div class="section-title">Notes</div>
    <div class="notes-box">${event.notes}</div>
  </div>
  ` : ''}

  ${event.signer_name || signatureDataUrl ? `
  <div class="signature-section">
    <div class="section-title" style="border: none; margin-bottom: 5px;">Signature</div>
    ${signatureDataUrl ? `
    <div class="signature-box">
      <img src="${signatureDataUrl}" alt="Signature" />
    </div>
    ` : '<div class="signature-box"><em>Signature on file</em></div>'}
    <div class="signature-info">
      <span>Signed by: <strong>${event.signer_name || 'On file'}</strong></span>
      <span>Date: ${formattedDate} ${formattedTime}</span>
    </div>
  </div>
  ` : ''}

  <div class="compliance">
    <strong>Compliance Notice:</strong> This manifest documents the movement of tire recycling equipment in accordance with applicable regulations.
  </div>

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-US')} | Manifest ID: ${manifestNumber}</p>
    <p>Document Reference: ${event_id}</p>
  </div>
</body>
</html>
    `;

    // Store the HTML as manifest document
    const pdfPath = `trailer-manifests/${organization_id}/${manifestNumber}.html`;
    
    const { error: uploadError } = await supabase.storage
      .from('manifests')
      .upload(pdfPath, htmlContent, {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) {
      console.error('[TrailerManifest] Upload error:', uploadError);
      throw new Error(`Failed to upload manifest: ${uploadError.message}`);
    }

    // Update the event with manifest info and contact details
    const updateData: any = {
      manifest_number: manifestNumber,
      manifest_pdf_path: pdfPath,
    };

    if (recipient_name) updateData.location_contact_name = recipient_name;
    if (recipient_email) updateData.location_contact_email = recipient_email;

    const { error: updateError } = await supabase
      .from('trailer_events')
      .update(updateData)
      .eq('id', event_id);

    if (updateError) {
      console.error('[TrailerManifest] Update error:', updateError);
      throw new Error(`Failed to update event: ${updateError.message}`);
    }

    console.log(`[TrailerManifest] Manifest saved: ${manifestNumber}`);

    // Send email if requested and we have a recipient
    let emailResult = null;
    const emailRecipient = recipient_email || event.location_contact_email;
    
    if (send_email && emailRecipient && resendKey) {
      console.log(`[TrailerManifest] Sending email to: ${emailRecipient}`);
      
      const resend = new Resend(resendKey);
      
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
    .container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #1A4314, #2d6b23); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .manifest-details { background: #f8fafc; border-left: 4px solid #1A4314; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .detail-row { margin: 10px 0; }
    .detail-label { font-weight: bold; color: #374151; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${org?.name || 'BSG Tire Recycling'}</h1>
      <p style="margin: 5px 0 0; opacity: 0.9;">Trailer Move Confirmation</p>
    </div>
    <div class="content">
      <p>Hello${recipient_name ? ` ${recipient_name}` : ''},</p>
      <p>A trailer move has been documented at your location. Please find the details below:</p>
      
      <div class="manifest-details">
        <h3 style="margin-top: 0; color: #1A4314;">Manifest ${manifestNumber}</h3>
        <div class="detail-row"><span class="detail-label">Event Type:</span> ${eventTypeLabels[event.event_type] || event.event_type}</div>
        <div class="detail-row"><span class="detail-label">Trailer:</span> ${event.trailer?.trailer_number || 'N/A'}</div>
        <div class="detail-row"><span class="detail-label">Location:</span> ${event.location_name || 'N/A'}</div>
        <div class="detail-row"><span class="detail-label">Date:</span> ${formattedDate} at ${formattedTime}</div>
        <div class="detail-row"><span class="detail-label">Driver:</span> ${driverName}</div>
      </div>
      
      <p>The manifest document is attached to this email for your records.</p>
      
      <div class="footer">
        <p><strong>${org?.name || 'BSG Tire Recycling'}</strong><br>
        Committed to sustainable tire recycling.</p>
        <p style="font-size: 11px;">This is an automated notification.</p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      try {
        const sentEmail = await resend.emails.send({
          from: `${org?.name || 'BSG Tire Recycling'} <noreply@bsgtires.com>`,
          to: [emailRecipient],
          subject: `Trailer Manifest ${manifestNumber} - ${eventTypeLabels[event.event_type] || event.event_type}`,
          html: emailHtml,
          attachments: [{
            filename: `${manifestNumber}.html`,
            content: b64encode(new TextEncoder().encode(htmlContent)),
          }],
        });

        console.log('[TrailerManifest] Email sent:', sentEmail);

        // Update event with email tracking
        await supabase
          .from('trailer_events')
          .update({
            email_sent_at: new Date().toISOString(),
            email_sent_to: [emailRecipient],
            email_status: 'sent',
            email_resend_id: sentEmail.data?.id,
          })
          .eq('id', event_id);

        emailResult = { sent: true, to: emailRecipient, id: sentEmail.data?.id };
      } catch (emailError: any) {
        console.error('[TrailerManifest] Email error:', emailError);
        
        await supabase
          .from('trailer_events')
          .update({
            email_status: 'failed',
            email_error: emailError.message,
          })
          .eq('id', event_id);

        emailResult = { sent: false, error: emailError.message };
      }
    }

    console.log(`[TrailerManifest] Complete. Manifest: ${manifestNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        manifest_number: manifestNumber,
        pdf_path: pdfPath,
        email: emailResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[TrailerManifest] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});