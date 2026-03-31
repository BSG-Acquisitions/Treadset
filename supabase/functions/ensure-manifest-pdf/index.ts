import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Michigan v4 hardcoded fallback field mapping
const MICHIGAN_V4_FIELDS = {
  manifest_number: 'Manifest_Number',
  vehicle_trailer: 'Vehicle_Trailer',
  generator_name: 'Generator_Name',
  generator_mail_address: 'Generator_Mailing_Address',
  generator_city: 'Generator_City',
  generator_state: 'Generator_State',
  generator_zip: 'Generator_Zip',
  generator_county: 'Generator_County',
  generator_phone: 'Generator_Phone',
  generator_physical_address: 'Physical_Mailing_Address',
  generator_physical_city: 'Physical_City',
  generator_physical_state: 'Physical_State',
  generator_physical_zip: 'Physical_Zip',
  hauler_name: 'Hauler_Name',
  hauler_mail_address: 'Hauler_Address',
  hauler_city: 'Hauler_City',
  hauler_state: 'Hauler_State',
  hauler_zip: 'Hauler_Zip',
  hauler_phone: 'Hauler_Phone',
  hauler_mi_reg: 'MI_SCRAP_TIRE_HAULER_REG_',
  hauler_other_id: 'Collection_Site_Reg_#',
  receiver_name: 'Receiver_Name',
  receiver_physical_address: 'Receiver_Address',
  receiver_city: 'Receiver_City',
  receiver_state: 'Receiver_State',
  receiver_zip: 'Receiver_Zip',
  receiver_phone: 'Receiver_Phone',
  passenger_car_count: 'Passenger_Car',
  truck_count: 'Truck',
  oversized_count: 'Oversized',
  hauler_gross_weight: 'Gross',
  hauler_tare_weight: 'Tare',
  hauler_net_weight: 'Net_Weight',
  generator_volume_weight: 'Passenger_Tire_Equivalents',
  hauler_total_pte: 'Passenger_Tire_Equivalents',
  receiver_total_pte: 'Passenger_Tire_Equivalents',
  generator_signature: 'Generator_Signature _es_:signer:signature',
  hauler_signature: 'Hauler_Signature _es_:signer:signature',
  receiver_signature: 'Processor_Signature _es_:signer:signature',
  generator_print_name: 'Generator_Print_Name',
  hauler_print_name: 'Hauler_Print_Name',
  receiver_print_name: 'Processor_Print_Name',
  generator_date: 'Generator_Date',
  hauler_date: 'Hauler_Date',
  receiver_date: 'Processor_Date',
};

const MICHIGAN_TEMPLATE = 'Michigan_Manifest_Acroform_V4.pdf';

/**
 * Build domain data from manifest row (state-agnostic)
 */
function buildDomainData(m: any, org?: any): Record<string, string> {
  return {
    manifest_number: String(m.manifest_number || ''),
    vehicle_trailer: m.vehicle_trailer ? String(m.vehicle_trailer) : '',
    generator_name: m.client?.company_name || '',
    generator_mail_address: m.client?.mailing_address || m.location?.address || '',
    generator_city: m.client?.city || '',
    generator_state: m.client?.state || '',
    generator_zip: m.client?.zip || '',
    generator_county: m.client?.county || '',
    generator_phone: m.client?.phone || '',
    generator_physical_address: m.client?.physical_address || m.client?.mailing_address || '',
    generator_physical_city: m.client?.physical_city || m.client?.city || '',
    generator_physical_state: m.client?.physical_state || m.client?.state || '',
    generator_physical_zip: m.client?.physical_zip || m.client?.zip || '',
    hauler_name: m.hauler?.hauler_name || m.hauler?.company_name || '',
    hauler_mail_address: m.hauler?.hauler_mailing_address || m.hauler?.mailing_address || '',
    hauler_city: m.hauler?.hauler_city || m.hauler?.city || '',
    hauler_state: m.hauler?.hauler_state || m.hauler?.state || '',
    hauler_zip: m.hauler?.hauler_zip || m.hauler?.zip || '',
    hauler_phone: m.hauler?.hauler_phone || m.hauler?.phone || '',
    hauler_mi_reg: m.hauler?.hauler_mi_reg || org?.state_registration || '',
    hauler_other_id: '',
    receiver_name: '',
    receiver_physical_address: '',
    receiver_city: '',
    receiver_state: '',
    receiver_zip: '',
    receiver_phone: '',
    passenger_car_count: String((m.pte_off_rim || 0) + (m.pte_on_rim || 0)),
    truck_count: String(
      ((m.commercial_17_5_19_5_off || 0) + (m.commercial_17_5_19_5_on || 0)) +
      ((m.commercial_22_5_off || 0) + (m.commercial_22_5_on || 0))
    ),
    oversized_count: String((m.otr_count || 0) + (m.tractor_count || 0)),
    hauler_gross_weight: (Number(m.gross_weight_lbs || 0)).toFixed(1),
    hauler_tare_weight: (Number(m.tare_weight_lbs || 0)).toFixed(1),
    hauler_net_weight: Math.max(0, Math.round((Number(m.gross_weight_lbs || 0) - Number(m.tare_weight_lbs || 0)) * 10) / 10).toFixed(1),
    generator_volume_weight: '',
    hauler_total_pte: '',
    receiver_total_pte: '',
    generator_signature: m.customer_signature_png_path || '',
    hauler_signature: m.driver_signature_png_path || '',
    receiver_signature: '',
    generator_print_name: m.generator_print_name || '',
    hauler_print_name: m.hauler_print_name || '',
    receiver_print_name: '',
    generator_date: m.generator_signed_at ? new Date(m.generator_signed_at).toISOString().split('T')[0] : '',
    hauler_date: m.hauler_signed_at ? new Date(m.hauler_signed_at).toISOString().split('T')[0] : '',
    receiver_date: '',
  };
}

/**
 * Apply a field mapping to translate domain data to PDF field names
 */
function applyFieldMapping(domainData: Record<string, string>, fieldMapping: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [domainKey, pdfFieldName] of Object.entries(fieldMapping)) {
    if (domainData[domainKey] !== undefined) {
      result[pdfFieldName] = domainData[domainKey];
    }
  }
  return result;
}

Deno.serve(async (req) => {
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
      .select(`*, client:clients(*), location:locations(*)`)
      .eq('id', pickup_id)
      .single();

    if (pickupError || !pickup) {
      throw new Error(`Failed to fetch pickup: ${pickupError?.message}`);
    }

    // 2. Check if PDF already exists and we're not forcing regeneration
    if (pickup.manifest_pdf_path && !force_regenerate) {
      console.log('PDF already exists, skipping generation');
      return new Response(
        JSON.stringify({ success: true, message: 'PDF already exists', manifest_pdf_path: pickup.manifest_pdf_path, skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Look up the organization's state_code and state compliance config
    const { data: org } = await supabase
      .from('organizations')
      .select('state_code')
      .eq('id', pickup.organization_id)
      .single();

    const stateCode = org?.state_code || 'MI';
    console.log(`Organization state: ${stateCode}`);

    let templatePath = MICHIGAN_TEMPLATE;
    let fieldMapping: Record<string, string> = MICHIGAN_V4_FIELDS;

    if (stateCode !== 'MI') {
      const { data: stateConfig } = await supabase
        .from('state_compliance_configs')
        .select('manifest_template_path, field_mapping')
        .eq('state_code', stateCode)
        .maybeSingle();

      if (stateConfig?.manifest_template_path && stateConfig?.field_mapping) {
        templatePath = stateConfig.manifest_template_path;
        fieldMapping = stateConfig.field_mapping as Record<string, string>;
        console.log(`Using ${stateCode} template: ${templatePath}`);
      } else {
        console.log(`No template configured for ${stateCode}, falling back to Michigan`);
      }
    }

    // 4. Find or create manifest for this pickup
    let manifestId = pickup.manifest_id;

    if (!manifestId) {
      const { data: existingManifests } = await supabase
        .from('manifests')
        .select('id')
        .eq('pickup_id', pickup_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingManifests && existingManifests.length > 0) {
        manifestId = existingManifests[0].id;
      } else {
        const { data: manifestNumberData } = await supabase
          .rpc('generate_manifest_number', { org_id: pickup.organization_id });

        const manifestNumber = manifestNumberData || `M-${Date.now()}`;

        const { data: newManifest, error: manifestError } = await supabase
          .from('manifests')
          .insert({
            organization_id: pickup.organization_id,
            client_id: pickup.client_id,
            location_id: pickup.location_id,
            pickup_id: pickup.id,
            manifest_number: manifestNumber,
            status: 'AWAITING_RECEIVER_SIGNATURE',
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
      }
    }

    // 5. Fetch manifest and build PDF data
    const { data: manifestRow, error: manifestFetchError } = await supabase
      .from('manifests')
      .select(`*, client:clients(*), hauler:haulers(*), location:locations(*)`)
      .eq('id', manifestId)
      .maybeSingle();

    if (manifestFetchError) {
      throw new Error(`Failed to fetch manifest: ${manifestFetchError.message}`);
    }

    const domainData = buildDomainData(manifestRow || {});
    const v4Fields = applyFieldMapping(domainData, fieldMapping);

    const outputPath = `manifests/acroform-${manifestId}-${Date.now()}.pdf`;

    const { data: pdfResult, error: pdfError } = await supabase.functions.invoke(
      'generate-acroform-manifest',
      { body: { templatePath, manifestData: v4Fields, manifestId, outputPath } }
    );

    if (pdfError) {
      throw new Error(`PDF generation failed: ${pdfError.message}`);
    }

    // 6. Update the pickup with the manifest info
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
      throw new Error(`Failed to update pickup: ${updateError.message}`);
    }

    console.log(`Successfully ensured manifest PDF for pickup ${pickup_id} (state: ${stateCode})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Manifest PDF generated successfully',
        manifest_id: manifestId,
        manifest_pdf_path: pdfResult.pdf_path,
        pickup_id,
        state_code: stateCode,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ensure-manifest-pdf:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
