import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, PDFForm, PDFTextField, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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

    // Download the AcroForm template from storage - user confirmed it's in manifests bucket
    const templatePath = `templates/${body.templatePath}`;
    console.log(`Downloading template from: manifests bucket, path: ${templatePath}`);

    const { data: templateFile, error: downloadError } = await supabase.storage
      .from('manifests')
      .download(templatePath);

    if (downloadError) {
      console.error('Error downloading template:', downloadError);
      return new Response(
        JSON.stringify({ 
          error: 'Template not found', 
          details: downloadError.message,
          path: templatePath,
          bucket: 'manifests'
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

    // Fill the form fields and handle signatures
    const signatureFields = ['Generator_Signature', 'Hauler_Signature', 'Receiver_Signature'];
    
    for (const [fieldName, value] of Object.entries(body.manifestData)) {
      try {
        // Special handling for signature fields
        if (signatureFields.includes(fieldName) && value) {
          console.log(`Processing signature field: ${fieldName} with path: ${value}`);
          
          try {
            const strVal = String(value);

            // If a full URL was provided, fetch directly. Otherwise, treat as storage path.
            let signatureBytes: ArrayBuffer | null = null;
            if (/^https?:\/\//i.test(strVal)) {
              console.log(`Fetching signature from URL for ${fieldName}`);
              const resp = await fetch(strVal);
              if (!resp.ok) throw new Error(`HTTP ${resp.status} when fetching signature URL`);
              signatureBytes = await resp.arrayBuffer();
            } else {
              // Normalize path: strip leading bucket name or slashes if present
              const normalizeStoragePath = (p: string) => p.replace(/^manifests\//, '').replace(/^\/+/, '');
              const signaturePath = normalizeStoragePath(strVal);
              console.log(`Normalized signature path for download: ${signaturePath}`);

              const { data: signatureBlob, error: downloadError } = await supabase.storage
                .from('manifests')
                .download(signaturePath);
              
              if (downloadError || !signatureBlob) {
                console.warn(`Direct download failed for ${fieldName}. Trying signed URL...`, downloadError);
                const { data: signed, error: signErr } = await supabase.storage
                  .from('manifests')
                  .createSignedUrl(signaturePath, 300);
                if (signErr || !signed?.signedUrl) {
                  console.error(`Failed to create signed URL for ${fieldName}:`, signErr);
                  continue;
                }
                const resp = await fetch(signed.signedUrl);
                if (!resp.ok) {
                  console.error(`Failed to fetch signed URL for ${fieldName}: HTTP ${resp.status}`);
                  continue;
                }
                signatureBytes = await resp.arrayBuffer();
              } else {
                signatureBytes = await signatureBlob.arrayBuffer();
              }
            }
            
            if (!signatureBytes) {
              console.warn(`No bytes for signature ${fieldName}`);
              continue;
            }

            const signatureImage = await pdfDoc.embedPng(signatureBytes);
            
            // Try to use the actual AcroForm field's widget rectangle
            try {
              const field = form.getField(fieldName);
              const anyField: any = field as any;

              const widgets =
                anyField?.acroField?.getWidgets?.() ??
                anyField?.getWidgets?.() ??
                [];

              if (widgets.length > 0) {
                const widget: any = widgets[0];
                const rect: any = widget.getRectangle?.() ?? {};
                // Normalize rectangle fields across pdf-lib versions
                const x = rect.x ?? rect.left ?? rect.x1 ?? rect.lowerLeftX;
                const y = rect.y ?? rect.bottom ?? rect.y1 ?? rect.lowerLeftY;
                const width = rect.width ?? (rect.x2 !== undefined && rect.x1 !== undefined ? rect.x2 - rect.x1 : undefined);
                const height = rect.height ?? (rect.y2 !== undefined && rect.y1 !== undefined ? rect.y2 - rect.y1 : undefined);

                const signatureSize = { width: 110, height: 45 };
                const pages = pdfDoc.getPages();
                const targetPage = pages[0];

                targetPage.drawImage(signatureImage, {
                  x: Number(x ?? 440),
                  y: Number(y ?? 300),
                  width: Number(width ?? signatureSize.width),
                  height: Number(height ?? signatureSize.height),
                });
                console.log(`Embedded signature image for ${fieldName} at acro widget position`);
              } else {
                throw new Error('No widgets found for field');
              }
            } catch (fieldError) {
              console.warn(`Signature field "${fieldName}" not found or invalid, drawing at default position:`, (fieldError as any)?.message);
              
              // Fallback to drawing at default coordinates
              const pages = pdfDoc.getPages();
              if (pages.length > 0) {
                const firstPage = pages[0];
                const signatureSize = { width: 110, height: 45 };
                let yPosition = 300; // Default position
                
                if (fieldName === 'Generator_Signature') yPosition = 400;
                else if (fieldName === 'Hauler_Signature') yPosition = 300;
                else if (fieldName === 'Receiver_Signature') yPosition = 200;
                
                firstPage.drawImage(signatureImage, {
                  x: 440,
                  y: yPosition,
                  width: signatureSize.width,
                  height: signatureSize.height,
                });
                console.log(`Embedded signature image for ${fieldName} at fallback position`);
              }
            }
          } catch (signatureError) {
            console.error(`Failed to process signature for ${fieldName}:`, signatureError);
          }
        } else {
          // Regular text field handling
          const field = form.getField(fieldName);
          
          if (field instanceof PDFTextField) {
            field.setText(String(value || ''));
            console.log(`Set text field "${fieldName}" to: "${value}"`);
          } else {
            console.log(`Field "${fieldName}" is not a text field, type: ${field.constructor.name}`);
          }
        }
      } catch (error) {
        console.warn(`Could not set field "${fieldName}":`, error.message);
      }
    }

    // Update field appearances with an embedded standard font so values render in all viewers
    try {
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      form.updateFieldAppearances(helvetica);
    } catch (e) {
      console.warn('Could not update field appearances:', e);
    }

    // Flatten the form to make it non-editable and ensure values are visible
    form.flatten();

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