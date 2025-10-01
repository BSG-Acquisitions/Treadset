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
  meta?: {
    generator_time?: string;
    hauler_time?: string;
    receiver_time?: string;
    generator_signature_timestamp?: string;
    hauler_signature_timestamp?: string;
    receiver_signature_timestamp?: string;
  };
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

    // Download the AcroForm template from storage with fallbacks
    async function fetchTemplateBytes(): Promise<ArrayBuffer | null> {
      // 1) Try templates bucket at root
      try {
        console.log(`Attempt 1: templates bucket, path: ${body.templatePath}`);
        const { data, error } = await supabase.storage.from('templates').download(body.templatePath);
        if (!error && data) return await data.arrayBuffer();
        console.warn('Attempt 1 failed:', error?.message);
      } catch (e) {
        console.warn('Attempt 1 exception:', (e as any)?.message);
      }
      // 2) Try manifests bucket under templates/
      try {
        const altPath = `templates/${body.templatePath}`;
        console.log(`Attempt 2: manifests bucket, path: ${altPath}`);
        const { data, error } = await supabase.storage.from('manifests').download(altPath);
        if (!error && data) return await data.arrayBuffer();
        console.warn('Attempt 2 failed:', error?.message);
      } catch (e) {
        console.warn('Attempt 2 exception:', (e as any)?.message);
      }
      // 3) Try manifests bucket at root
      try {
        console.log(`Attempt 3: manifests bucket, path: ${body.templatePath}`);
        const { data, error } = await supabase.storage.from('manifests').download(body.templatePath);
        if (!error && data) return await data.arrayBuffer();
        console.warn('Attempt 3 failed:', error?.message);
      } catch (e) {
        console.warn('Attempt 3 exception:', (e as any)?.message);
      }
      // 4) Try signed URL from templates bucket as last resort
      try {
        console.log('Attempt 4: signed URL from templates bucket');
        const { data: signed, error } = await supabase.storage.from('templates').createSignedUrl(body.templatePath, 300);
        if (!error && signed?.signedUrl) {
          const resp = await fetch(signed.signedUrl);
          if (resp.ok) return await resp.arrayBuffer();
          console.warn('Signed URL fetch failed:', resp.status);
        } else {
          console.warn('Create signed URL failed:', error?.message);
        }
      } catch (e) {
        console.warn('Attempt 4 exception:', (e as any)?.message);
      }
      return null;
    }

    const templateBytes = await fetchTemplateBytes();
    if (!templateBytes) {
      return new Response(
        JSON.stringify({
          error: 'Template not found in storage',
          tried: [
            'templates: ' + body.templatePath,
            'manifests: templates/' + body.templatePath,
            'manifests: ' + body.templatePath
          ]
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load the PDF template
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    console.log('Available form fields:');
    const fields = form.getFields();
    fields.forEach(field => {
      console.log(`- ${field.getName()}: ${field.constructor.name}`);
    });

    // Fill the form fields and handle signatures
    const isSignatureField = (name: string) => {
      const n = name.toLowerCase();
      return n.includes('signature') || n.includes('_es_:signer:signature');
    };
    const getSignatureRole = (name: string): 'generator' | 'hauler' | 'receiver' => {
      const n = name.toLowerCase();
      if (n.includes('processor') || n.includes('receiver')) return 'receiver';
      if (n.includes('hauler')) return 'hauler';
      return 'generator';
    };
    const getTimeFor = (name: string): string | undefined => {
      const role = getSignatureRole(name);
      if (role === 'generator') return body.meta?.generator_time || body.manifestData['Generator_Time'] || (body.manifestData as any)['generator_time'];
      if (role === 'hauler') return body.meta?.hauler_time || body.manifestData['Hauler_Time'] || (body.manifestData as any)['hauler_time'];
      return body.meta?.receiver_time || body.manifestData['Processor_Time'] || body.manifestData['Receiver_Time'] || (body.manifestData as any)['receiver_time'];
    };
    
    for (const [fieldName, value] of Object.entries(body.manifestData)) {
      try {
        // Special handling for signature fields
        if (isSignatureField(fieldName) && value) {
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
            let targetField = null;
            try {
              // First, try to find the exact field name
              targetField = form.getField(fieldName);
              console.log(`Found exact field match: ${fieldName}`);
            } catch {
              // Field not found, try fuzzy matching
              console.log(`Exact field "${fieldName}" not found, trying fuzzy matching...`);
              
              // Get all field names and find signature-related ones
              const allFieldNames = form.getFields().map(f => f.getName());
              console.log('All available form fields for signature matching:', allFieldNames);
              
              // Look for fields containing "signature" or similar patterns
              const signatureFields = allFieldNames.filter(name => 
                name.toLowerCase().includes('signature') || 
                name.toLowerCase().includes('sign') ||
                name.includes('_es_:signer:')
              );
              console.log('Found signature-related fields:', signatureFields);
              
              // Try to match based on the signature type
              let matchedFieldName = null;
              if (fieldName === 'Generator_Signature') {
                matchedFieldName = signatureFields.find(name => 
                  name.toLowerCase().includes('generator') || 
                  name.toLowerCase().includes('gen')
                );
              } else if (fieldName === 'Hauler_Signature') {
                matchedFieldName = signatureFields.find(name => 
                  name.toLowerCase().includes('hauler') || 
                  name.toLowerCase().includes('haul')
                );
              } else if (fieldName === 'Receiver_Signature') {
                matchedFieldName = signatureFields.find(name => 
                  name.toLowerCase().includes('receiver') || 
                  name.toLowerCase().includes('processor') ||
                  name.toLowerCase().includes('recv')
                );
              }
              
              // If no specific match found, try to get fields in order
              if (!matchedFieldName && signatureFields.length > 0) {
                if (fieldName === 'Generator_Signature') matchedFieldName = signatureFields[0];
                else if (fieldName === 'Hauler_Signature') matchedFieldName = signatureFields[1];
                else if (fieldName === 'Receiver_Signature') matchedFieldName = signatureFields[2];
              }
              
              if (matchedFieldName) {
                console.log(`Fuzzy matched "${fieldName}" to "${matchedFieldName}"`);
                try {
                  targetField = form.getField(matchedFieldName);
                } catch {
                  console.warn(`Could not get fuzzy matched field: ${matchedFieldName}`);
                }
              }
            }

            // Try to use the field's widget rectangle if we found a field
            let signaturePlaced = false;
            if (targetField) {
              try {
                const anyField: any = targetField as any;
                const widgets = anyField?.acroField?.getWidgets?.() ?? anyField?.getWidgets?.() ?? [];

                if (widgets.length > 0) {
                  const widget: any = widgets[0];
                  const rect: any = widget.getRectangle?.() ?? {};
                  
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
                    width: Math.min(Number(width ?? signatureSize.width), signatureSize.width),
                    height: Math.min(Number(height ?? signatureSize.height), signatureSize.height),
                  });
                  // Optional timestamp annotation next to signature
                  try {
                    const ts = getTimeFor(fieldName);
                    if (ts) {
                      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                      targetPage.drawText(ts, {
                        x: Number(x ?? 440),
                        y: Number(y ?? 300) - 12,
                        size: 8,
                        font,
                      });
                    }
                  } catch (e) {
                    console.warn('Failed to draw timestamp text:', (e as any)?.message);
                  }
                  console.log(`Embedded signature image for ${fieldName} at field widget position (${x}, ${y})`);
                  signaturePlaced = true;
                }
              } catch (widgetError) {
                console.warn(`Could not get widget position for field:`, (widgetError as any)?.message);
              }
            }
            
            // Fallback to default coordinates if we couldn't place it at a field position
            if (!signaturePlaced) {
              console.warn(`Using fallback position for ${fieldName}`);
              const pages = pdfDoc.getPages();
              if (pages.length > 0) {
                const firstPage = pages[0];
                const signatureSize = { width: 110, height: 45 };
                let yPosition = 300;
                
                if (fieldName === 'Generator_Signature') yPosition = 400;
                else if (fieldName === 'Hauler_Signature') yPosition = 300;
                else if (fieldName === 'Receiver_Signature') yPosition = 200;
                
                firstPage.drawImage(signatureImage, {
                  x: 440,
                  y: yPosition,
                  width: signatureSize.width,
                  height: signatureSize.height,
                });
                // Draw timestamp with signature
                try {
                  let timestampText = "";
                  if (fieldName === 'Generator_Signature' && body.meta?.generator_signature_timestamp) {
                    timestampText = `Signed: ${body.meta.generator_signature_timestamp}`;
                  } else if (fieldName === 'Hauler_Signature' && body.meta?.hauler_signature_timestamp) {
                    timestampText = `Signed: ${body.meta.hauler_signature_timestamp}`;
                  } else if (fieldName === 'Receiver_Signature' && body.meta?.receiver_signature_timestamp) {
                    timestampText = `Signed: ${body.meta.receiver_signature_timestamp}`;
                  }
                  
                  if (timestampText) {
                    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                    firstPage.drawText(timestampText, {
                      x: 440,
                      y: yPosition - 12,
                      size: 8,
                      font,
                    });
                  }
                } catch (e) {
                  console.warn('Failed to draw timestamp text (fallback):', (e as any)?.message);
                }
                console.log(`Embedded signature image for ${fieldName} at fallback position (440, ${yPosition})`);
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
      } catch (error: any) {
        console.warn(`Could not set field "${fieldName}":`, error?.message || 'Unknown error');
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
    const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(filledPdfBytes));
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

  } catch (error: any) {
    console.error('Error in generate-acroform-manifest function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);