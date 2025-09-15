import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, PDFForm, PDFTextField } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcroFormFillRequest {
  templatePath: string; // e.g., "Michigan_Manifest_AcroForm.pdf"
  manifestData: {
    // AcroForm field names mapped to values
    [fieldName: string]: string;
  };
  manifestId?: string;
  outputPath?: string; // Optional custom output path
}

const handler = async (req: Request): Promise<Response> => {
  console.log(`Method: ${req.method}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse request body
    const body: AcroFormFillRequest = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the AcroForm template from storage
    const templatePath = `templates/${body.templatePath}`;
    console.log(`Downloading template from: ${templatePath}`);

    const { data: templateFile, error: downloadError } = await supabase.storage
      .from('manifests')
      .download(templatePath);

    if (downloadError) {
      console.error('Error downloading template:', downloadError);
      return new Response(
        JSON.stringify({ 
          error: 'Template not found', 
          details: downloadError.message,
          path: templatePath
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load the PDF template
    const templateBytes = await templateFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    console.log('Available form fields:');
    const fields = form.getFields();
    fields.forEach(field => {
      console.log(`- ${field.getName()}: ${field.constructor.name}`);
    });

    // Fill the form fields
    Object.entries(body.manifestData).forEach(([fieldName, value]) => {
      try {
        const field = form.getField(fieldName);
        
        if (field instanceof PDFTextField) {
          field.setText(String(value || ''));
          console.log(`Set text field "${fieldName}" to: "${value}"`);
        } else {
          console.log(`Field "${fieldName}" is not a text field, type: ${field.constructor.name}`);
        }
      } catch (error) {
        console.warn(`Could not set field "${fieldName}":`, error.message);
      }
    });

    // Flatten the form to make it non-editable (optional)
    // form.flatten();

    // Generate the filled PDF
    const filledPdfBytes = await pdfDoc.save();

    // Generate output path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = body.outputPath || `manifests/filled-${timestamp}.pdf`;

    console.log(`Uploading filled PDF to: ${outputPath}`);

    // Upload the filled PDF to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('manifests')
      .upload(outputPath, filledPdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading filled PDF:', uploadError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upload filled PDF', 
          details: uploadError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update manifest record if manifestId provided
    if (body.manifestId) {
      console.log(`Updating manifest ${body.manifestId} with PDF path: ${outputPath}`);
      
      const { error: updateError } = await supabase
        .from('manifests')
        .update({ 
          pdf_path: outputPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', body.manifestId);

      if (updateError) {
        console.error('Error updating manifest:', updateError);
        // Don't fail the entire request, just log the error
      }
    }

    // Generate a signed URL for the filled PDF
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('manifests')
      .createSignedUrl(outputPath, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
    }

    // Calculate hash for integrity checking
    const hash = await crypto.subtle.digest('SHA-256', filledPdfBytes);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('Successfully generated AcroForm manifest PDF');

    return new Response(
      JSON.stringify({
        success: true,
        pdfPath: outputPath,
        pdfUrl: signedUrlData?.signedUrl,
        hash: hashHex,
        fieldsProcessed: Object.keys(body.manifestData).length,
        message: 'AcroForm manifest PDF generated successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-acroform-manifest function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);