import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrailerManifestRequest {
  event_id: string;
  organization_id: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { event_id, organization_id }: TrailerManifestRequest = await req.json();

    if (!event_id || !organization_id) {
      throw new Error('Missing required fields: event_id, organization_id');
    }

    console.log(`[TrailerManifest] Generating manifest for event: ${event_id}`);

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

    // Generate manifest number
    const { data: manifestNumber, error: mnError } = await supabase
      .rpc('generate_trailer_manifest_number', { org_id: organization_id });

    if (mnError) {
      throw new Error(`Failed to generate manifest number: ${mnError.message}`);
    }

    console.log(`[TrailerManifest] Generated manifest number: ${manifestNumber}`);

    // Get organization info
    const { data: org } = await supabase
      .from('organizations')
      .select('name, logo_url')
      .eq('id', organization_id)
      .single();

    // Build HTML for PDF
    const eventDate = new Date(event.timestamp);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
      ? `${event.driver.first_name} ${event.driver.last_name}` 
      : 'Unknown Driver';

    // Get signature if exists
    let signatureDataUrl = '';
    if (event.signature_path) {
      const { data: signatureData } = await supabase.storage
        .from('manifests')
        .createSignedUrl(event.signature_path, 3600);
      signatureDataUrl = signatureData?.signedUrl || '';
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1A4314; padding-bottom: 20px; }
    .header h1 { color: #1A4314; margin: 0 0 10px 0; font-size: 24px; }
    .header .manifest-number { font-size: 18px; color: #666; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 14px; font-weight: bold; color: #1A4314; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .info-item { }
    .info-label { font-size: 12px; color: #666; margin-bottom: 3px; }
    .info-value { font-size: 14px; font-weight: 500; }
    .event-type { background: #1A4314; color: white; padding: 8px 16px; display: inline-block; border-radius: 4px; font-weight: bold; }
    .signature-box { border: 1px solid #ddd; padding: 15px; margin-top: 10px; min-height: 80px; }
    .signature-box img { max-height: 70px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center; }
    .notes { background: #f9f9f9; padding: 10px; border-radius: 4px; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${org?.name || 'Trailer Move Manifest'}</h1>
    <div class="manifest-number">${manifestNumber}</div>
  </div>

  <div class="section">
    <div class="section-title">Event Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Event Type</div>
        <div class="info-value"><span class="event-type">${eventTypeLabels[event.event_type] || event.event_type}</span></div>
      </div>
      <div class="info-item">
        <div class="info-label">Date & Time</div>
        <div class="info-value">${formattedDate}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Trailer Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Trailer Number</div>
        <div class="info-value">${event.trailer?.trailer_number || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Location</div>
        <div class="info-value">${event.location_name || 'Unknown Location'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Driver Information</div>
    <div class="info-grid">
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

  ${event.notes ? `
  <div class="section">
    <div class="section-title">Notes</div>
    <div class="notes">${event.notes}</div>
  </div>
  ` : ''}

  ${event.signer_name || signatureDataUrl ? `
  <div class="section">
    <div class="section-title">Signature</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Signed By</div>
        <div class="info-value">${event.signer_name || 'On file'}</div>
      </div>
    </div>
    ${signatureDataUrl ? `
    <div class="signature-box">
      <img src="${signatureDataUrl}" alt="Signature" />
    </div>
    ` : ''}
  </div>
  ` : ''}

  <div class="footer">
    Generated on ${new Date().toLocaleString('en-US')} | Manifest ID: ${event_id}
  </div>
</body>
</html>
    `;

    // For now, store the HTML as a text file (in production, would use a PDF generation service)
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

    // Update the event with manifest info
    const { error: updateError } = await supabase
      .from('trailer_events')
      .update({
        manifest_number: manifestNumber,
        manifest_pdf_path: pdfPath,
      })
      .eq('id', event_id);

    if (updateError) {
      console.error('[TrailerManifest] Update error:', updateError);
      throw new Error(`Failed to update event: ${updateError.message}`);
    }

    console.log(`[TrailerManifest] Successfully generated manifest: ${manifestNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        manifest_number: manifestNumber,
        pdf_path: pdfPath,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TrailerManifest] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
