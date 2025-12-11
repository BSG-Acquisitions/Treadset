import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { manifest_ids, client_name, date_range } = await req.json();

    if (!manifest_ids || manifest_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No manifest IDs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to prevent timeout
    const MAX_MANIFESTS = 200;
    if (manifest_ids.length > MAX_MANIFESTS) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_MANIFESTS} manifests allowed per export` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch manifest details
    const { data: manifests, error: manifestError } = await supabase
      .from('manifests')
      .select(`
        id,
        manifest_number,
        pdf_path,
        acroform_pdf_path,
        signed_at,
        created_at,
        clients:client_id (company_name)
      `)
      .in('id', manifest_ids);

    if (manifestError) {
      console.error('[BatchExport] Error fetching manifests:', manifestError);
      throw manifestError;
    }

    if (!manifests || manifests.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No manifests found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[BatchExport] Processing ${manifests.length} manifests`);

    const zip = new JSZip();
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const manifest of manifests) {
      const pdfPath = manifest.acroform_pdf_path || manifest.pdf_path;
      
      if (!pdfPath) {
        console.log(`[BatchExport] No PDF path for manifest ${manifest.manifest_number}`);
        failedCount++;
        errors.push(`${manifest.manifest_number}: No PDF available`);
        continue;
      }

      try {
        // Download PDF from storage
        const { data: pdfData, error: downloadError } = await supabase.storage
          .from('manifests')
          .download(pdfPath);

        if (downloadError || !pdfData) {
          console.error(`[BatchExport] Failed to download ${pdfPath}:`, downloadError);
          failedCount++;
          errors.push(`${manifest.manifest_number}: Download failed`);
          continue;
        }

        // Create filename
        const clientName = (manifest.clients as any)?.company_name || 'Unknown';
        const date = manifest.signed_at || manifest.created_at;
        const dateStr = date ? new Date(date).toISOString().split('T')[0] : 'undated';
        const safeClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filename = `${manifest.manifest_number}_${safeClientName}_${dateStr}.pdf`;

        // Add to ZIP
        const arrayBuffer = await pdfData.arrayBuffer();
        zip.file(filename, arrayBuffer);
        successCount++;
        
        console.log(`[BatchExport] Added ${filename}`);
      } catch (err) {
        console.error(`[BatchExport] Error processing ${manifest.manifest_number}:`, err);
        failedCount++;
        errors.push(`${manifest.manifest_number}: Processing error`);
      }
    }

    if (successCount === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No PDFs could be exported',
          details: errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate ZIP
    console.log(`[BatchExport] Generating ZIP with ${successCount} files`);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipBuffer = await zipBlob.arrayBuffer();

    // Create filename for ZIP
    const zipFilename = client_name 
      ? `Manifests_${client_name.replace(/[^a-zA-Z0-9]/g, '_')}_${date_range || 'export'}.zip`
      : `Manifests_${date_range || 'export'}.zip`;

    console.log(`[BatchExport] Complete: ${successCount} success, ${failedCount} failed`);

    return new Response(zipBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'X-Success-Count': successCount.toString(),
        'X-Failed-Count': failedCount.toString(),
      },
    });

  } catch (error) {
    console.error('[BatchExport] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
