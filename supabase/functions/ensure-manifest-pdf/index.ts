import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { pickup_id, force_regenerate = false } = await req.json();

    if (!pickup_id) {
      throw new Error('pickup_id is required');
    }

    console.log(`Ensuring manifest PDF for pickup: ${pickup_id}, force: ${force_regenerate}`);

    // 1. Fetch the pickup with all related data
    const { data: pickup, error: pickupError } = await supabase
      .from('pickups')
      .select(`
        *,
        client:clients(*),
        location:locations(*)
      `)
      .eq('id', pickup_id)
      .single();

    if (pickupError || !pickup) {
      throw new Error(`Failed to fetch pickup: ${pickupError?.message}`);
    }

    console.log(`Pickup status: ${pickup.status}, manifest_pdf_path: ${pickup.manifest_pdf_path}`);

    // 2. Check if PDF already exists and we're not forcing regeneration
    if (pickup.manifest_pdf_path && !force_regenerate) {
      console.log('PDF already exists, skipping generation');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'PDF already exists',
          manifest_pdf_path: pickup.manifest_pdf_path,
          skipped: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Find or create manifest for this pickup
    let manifestId = pickup.manifest_id;
    
    if (!manifestId) {
      console.log('No manifest_id on pickup, searching for existing manifest');
      const { data: existingManifests } = await supabase
        .from('manifests')
        .select('id')
        .eq('pickup_id', pickup_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingManifests && existingManifests.length > 0) {
        manifestId = existingManifests[0].id;
        console.log(`Found existing manifest: ${manifestId}`);
      } else {
        console.log('Creating new manifest for pickup');
        
        // Generate manifest number
        const { data: manifestNumberData } = await supabase
          .rpc('generate_manifest_number', { org_id: pickup.organization_id });
        
        const manifestNumber = manifestNumberData || `M-${Date.now()}`;

        // Create manifest
        const { data: newManifest, error: manifestError } = await supabase
          .from('manifests')
          .insert({
            organization_id: pickup.organization_id,
            client_id: pickup.client_id,
            location_id: pickup.location_id,
            pickup_id: pickup.id,
            manifest_number: manifestNumber,
            status: 'AWAITING_RECEIVER_SIGNATURE', // Always awaiting receiver sig when first created
            pte_on_rim: pickup.pte_count || 0,
            pte_off_rim: 0,
            otr_count: pickup.otr_count || 0,
            tractor_count: pickup.tractor_count || 0,
            subtotal: pickup.computed_revenue || 0,
            total: pickup.computed_revenue || 0,
            payment_method: pickup.payment_method || 'CASH',
            payment_status: pickup.payment_status || 'PENDING',
          })
          .select()
          .single();

        if (manifestError || !newManifest) {
          throw new Error(`Failed to create manifest: ${manifestError?.message}`);
        }

        manifestId = newManifest.id;
        console.log(`Created new manifest: ${manifestId}`);
      }
    }

    // 4. Fetch manifest and build v4 AcroForm data, then generate the PDF
    console.log(`Preparing AcroForm v4 payload for manifest: ${manifestId}`);

    const { data: manifestRow, error: manifestFetchError } = await supabase
      .from('manifests')
      .select(`*, client:clients(*), hauler:haulers(*), location:locations(*)`)
      .eq('id', manifestId)
      .maybeSingle();

    if (manifestFetchError) {
      throw new Error(`Failed to fetch manifest ${manifestId}: ${manifestFetchError.message}`);
    }

    const m: any = manifestRow || {};
    const v4Fields: Record<string, string> = {
      Manifest_Number: String(m.manifest_number || ''),
      Vehicle_Trailer: m.vehicle_trailer ? String(m.vehicle_trailer) : '',
      // Generator
      Generator_Name: m.client?.company_name || '',
      Generator_Mailing_Address: m.client?.mailing_address || m.location?.address || '',
      Generator_City: m.client?.city || '',
      Generator_State: m.client?.state || '',
      Generator_Zip: m.client?.zip || '',
      Physical_Mailing_Address: m.client?.physical_address || m.client?.mailing_address || '',
      Physical_City: m.client?.physical_city || m.client?.city || '',
      Physical_State: m.client?.physical_state || m.client?.state || '',
      Physical_Zip: m.client?.physical_zip || m.client?.zip || '',
      Generator_Phone: m.client?.phone || '',
      Generator_County: m.client?.county || '',
      // Hauler
      Hauler_Name: m.hauler?.hauler_name || m.hauler?.company_name || '',
      Hauler_Address: m.hauler?.hauler_mailing_address || m.hauler?.mailing_address || '',
      Hauler_City: m.hauler?.hauler_city || m.hauler?.city || '',
      Hauler_State: m.hauler?.hauler_state || m.hauler?.state || '',
      Hauler_Zip: m.hauler?.hauler_zip || m.hauler?.zip || '',
      Hauler_Phone: m.hauler?.hauler_phone || m.hauler?.phone || '',
      MI_SCRAP_TIRE_HAULER_REG_: m.hauler?.hauler_mi_reg || '',
      // Tire counts
      Passenger_Car: String((m.pte_off_rim || 0) + (m.pte_on_rim || 0)),
      Truck: String(((m.commercial_17_5_19_5_off || 0) + (m.commercial_17_5_19_5_on || 0)) + ((m.commercial_22_5_off || 0) + (m.commercial_22_5_on || 0))),
      Oversized: String((m.otr_count || 0) + (m.tractor_count || 0)),
      // Weights
      Gross: (m.gross_weight_lbs != null ? Number(m.gross_weight_lbs) : 0).toFixed(1),
      Tare: (m.tare_weight_lbs != null ? Number(m.tare_weight_lbs) : 0).toFixed(1),
      Net_Weight: (() => {
        const gross = Number(m.gross_weight_lbs || 0);
        const tare = Number(m.tare_weight_lbs || 0);
        const net = Math.max(0, Math.round((gross - tare) * 10) / 10);
        return net.toFixed(1);
      })(),
      // Signatures
      'Generator_Signature _es_:signer:signature': m.customer_signature_png_path || '',
      'Hauler_Signature _es_:signer:signature': m.driver_signature_png_path || '',
      Generator_Print_Name: m.generator_print_name || '',
      Hauler_Print_Name: m.hauler_print_name || '',
      Generator_Date: m.generator_signed_at ? new Date(m.generator_signed_at).toISOString().split('T')[0] : '',
      Hauler_Date: m.hauler_signed_at ? new Date(m.hauler_signed_at).toISOString().split('T')[0] : '',
    };

    const templatePath = 'Michigan_Manifest_AcroForm_V4.pdf';
    const outputPath = `manifests/acroform-${manifestId}-${Date.now()}.pdf`;

    const { data: pdfResult, error: pdfError } = await supabase.functions.invoke(
      'generate-acroform-manifest',
      {
        body: {
          templatePath,
          manifestData: v4Fields,
          manifestId: manifestId,
          outputPath,
        }
      }
    );

    if (pdfError) {
      console.error('PDF generation error:', pdfError);
      throw new Error(`PDF generation failed: ${pdfError.message}`);
    }

    console.log('PDF generation result:', pdfResult);

    // 5. Update the pickup with the manifest info
    const { error: updateError } = await supabase
      .from('pickups')
      .update({
        manifest_id: manifestId,
        manifest_pdf_path: pdfResult?.pdfPath,
        manifest_payment_status: pdfResult?.payment_status || pickup.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pickup_id);

    if (updateError) {
      console.error('Failed to update pickup:', updateError);
      throw new Error(`Failed to update pickup: ${updateError.message}`);
    }

    console.log(`Successfully ensured manifest PDF for pickup ${pickup_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Manifest PDF generated successfully',
        manifest_id: manifestId,
        manifest_pdf_path: pdfResult.pdf_path,
        pickup_id: pickup_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ensure-manifest-pdf:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
