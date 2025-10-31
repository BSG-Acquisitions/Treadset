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

    // 4. Generate the PDF using the generate-acroform-manifest function
    console.log(`Calling generate-acroform-manifest for manifest: ${manifestId}`);
    
    const { data: pdfResult, error: pdfError } = await supabase.functions.invoke(
      'generate-acroform-manifest',
      {
        body: {
          manifest_id: manifestId,
          force_regenerate: force_regenerate,
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
        manifest_pdf_path: pdfResult.pdf_path,
        manifest_payment_status: pdfResult.payment_status || pickup.payment_status,
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
