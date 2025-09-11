import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OverlayRequest {
  template_name: string;
  version: string;
  overlay_data: Record<string, any>;
  stop_id?: string;
  coordinate_mode?: 'top-left' | 'bottom-left';
  source_width?: number;
  source_height?: number;
  draw_guides?: boolean;
  offset_x?: number;
  offset_y?: number;
  scale_x?: number;
  scale_y?: number;
}

interface Calibration {
  field_name: string;
  page: number;
  x: number;
  y: number;
  font_size?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const reqJson = await req.json() as any;
    const { template_name, version, overlay_data, stop_id, coordinate_mode, source_width, source_height, draw_guides, offset_x, offset_y, scale_x, scale_y }: OverlayRequest = reqJson;
    
    console.log('Processing PDF overlay for template:', template_name, 'version:', version);
    console.log('Overlay data keys:', Object.keys(overlay_data));

    // 1) Fetch template info
    const { data: template, error: templateError } = await supabase
      .from('pdf_templates')
      .select('storage_bucket, storage_path')
      .eq('template_name', template_name)
      .single();

    if (templateError || !template) {
      console.error('Template not found:', templateError);
      return new Response(
        JSON.stringify({ 
          error: `Template ${template_name} not found in pdf_templates table`
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // 2) Fetch calibrations
    const { data: calibrations, error: calibrationsError } = await supabase
      .from('pdf_calibrations')
      .select('field_name, page, x, y, font_size')
      .eq('template_name', template_name)
      .eq('version', version);

    if (calibrationsError) {
      console.error('Error fetching calibrations:', calibrationsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch calibrations' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (!calibrations || calibrations.length === 0) {
      console.error('No calibrations found for template:', template_name, 'version:', version);
      return new Response(
        JSON.stringify({ 
          error: `No calibrations found for template ${template_name} version ${version}`
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`Found ${calibrations.length} calibrations`);

    // Infer source coordinate space from calibrations (max x/y) if not provided
    const globalMaxX = Math.max(...calibrations.map(c => Number(c.x)));
    const globalMaxY = Math.max(...calibrations.map(c => Number(c.y)));
    console.log('Calibration bounds', { globalMaxX, globalMaxY });

    // 3) Validation - check for missing fields
    const calKeys = new Set(calibrations.map(c => c.field_name));
    const dataKeys = new Set(Object.keys(overlay_data));
    const missing = calibrations
      .filter(c => overlay_data[c.field_name] == null || overlay_data[c.field_name] === undefined)
      .map(c => c.field_name);

    if (missing.length > 0) {
      console.warn('Missing fields:', missing);
      // Fill missing fields with empty strings to prevent crashes
      missing.forEach(field => {
        overlay_data[field] = '';
      });
    }

    // 4) Download template PDF
    const { data: templateData, error: downloadError } = await supabase.storage
      .from(template.storage_bucket)
      .download(template.storage_path);

    if (downloadError || !templateData) {
      console.error('Error downloading template:', downloadError);
      return new Response(
        JSON.stringify({ 
          error: `Template file not found: ${template.storage_bucket}/${template.storage_path}`
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // 5) Load and process PDF
    const templateBytes = await templateData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Helper function to get field type and apply appropriate nudges
    const getFieldTypeAndNudge = (fieldName: string) => {
      if (fieldName.includes('signature')) {
        return { type: 'signature', align: 'center', width: 150 };
      }
      if (fieldName.includes('date')) {
        return { type: 'date', align: 'center' };
      }
      if (fieldName.includes('count_') || fieldName.includes('_weight')) {
        return { type: 'number', align: 'left' };
      }
      // Generator, hauler, receiver text fields
      return { type: 'text', align: 'left' };
    };

    // Helper function to calculate optimal font size
    const calculateFontSize = (text: string, maxWidth: number, baseFontSize: number = 10) => {
      if (!text || maxWidth <= 0) return baseFontSize;
      
      // Simple approximation - each character is roughly 0.6 * fontSize wide for Helvetica
      const estimatedWidth = text.length * (baseFontSize * 0.6);
      
      if (estimatedWidth > maxWidth) {
        const newFontSize = Math.max(6, (maxWidth / (text.length * 0.6))); // Minimum 6pt
        return Math.min(newFontSize, baseFontSize); // Don't exceed base font size
      }
      
      return baseFontSize;
    };

    // 6) Apply overlays with precise positioning
    for (const cal of calibrations) {
      const value = overlay_data[cal.field_name];
      if (value == null || value === undefined) continue;

      const pageIndex = (cal.page || 1) - 1;
      if (pageIndex >= pages.length) {
        console.warn(`Page ${cal.page} not found in PDF, skipping field ${cal.field_name}`);
        continue;
      }

      const page = pages[pageIndex];
      const fieldConfig = getFieldTypeAndNudge(cal.field_name);

      // Use exact coordinates from calibration
      const finalX = Number(cal.x) + (offset_x || 0);
      const finalY = Number(cal.y) + (offset_y || 0);
      const fontSize = cal.font_size || 10;

      // Optional visual guides for calibration
      if (draw_guides) {
        page.drawCircle({
          x: finalX,
          y: finalY,
          size: 3,
          color: rgb(1, 0, 0),
          opacity: 0.7,
        });
        
        // Draw field type indicator
        page.drawText(`${fieldConfig.type.substring(0, 1).toUpperCase()}-${cal.field_name}`, {
          x: finalX + 5,
          y: finalY + 5,
          size: 6,
          font: font,
          color: rgb(0, 0, 1),
        });
      }

      // Check if value is an image path or data URL (signatures)
      if (typeof value === 'string' && (value.startsWith('signatures/') || value.startsWith('data:image/'))) {
        try {
          let imageBytes: ArrayBuffer;
          
          if (value.startsWith('data:image/')) {
            // Handle data URL
            const base64Data = value.split(',')[1];
            const binaryString = atob(base64Data);
            imageBytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              (imageBytes as Uint8Array)[i] = binaryString.charCodeAt(i);
            }
          } else {
            // Handle storage path
            const { data: imageData, error: imageError } = await supabase.storage
              .from('manifests')
              .download(value);
            
            if (imageError || !imageData) {
              console.warn(`Image not found: ${value}, skipping`);
              continue;
            }
            
            imageBytes = await imageData.arrayBuffer();
          }

          const image = await pdfDoc.embedPng(imageBytes);
          const imageScale = 0.3;
          const imageDims = image.scale(imageScale);
          
          // Center signatures at the given coordinates
          let imageX = finalX;
          if (fieldConfig.type === 'signature') {
            imageX = finalX - (imageDims.width / 2);
          }
          
          page.drawImage(image, {
            x: imageX,
            y: finalY - imageDims.height,
            width: imageDims.width,
            height: imageDims.height,
          });
        } catch (imageError) {
          console.error(`Error embedding image for ${cal.field_name}:`, imageError);
          // Fall back to drawing the text value
          const textValue = String(value);
          let textX = finalX;
          
          if (fieldConfig.align === 'center') {
            const estimatedTextWidth = textValue.length * (fontSize * 0.6);
            textX = finalX - (estimatedTextWidth / 2);
          }
          
          page.drawText(textValue, {
            x: textX,
            y: finalY,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
        }
      } else {
        // Draw text with alignment
        const textValue = String(value);
        let textX = finalX;
        
        if (fieldConfig.align === 'center') {
          // Calculate text width for centering
          const estimatedTextWidth = textValue.length * (fontSize * 0.6);
          textX = finalX - (estimatedTextWidth / 2);
        }
        
        page.drawText(textValue, {
          x: textX,
          y: finalY,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
    }

    // 7) Save PDF
    const pdfBytes = await pdfDoc.save();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = stop_id ? `stop-${stop_id}-${timestamp}.pdf` : `manifest-${timestamp}.pdf`;
    const filePath = `completed/${filename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('manifests')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      throw new Error('Failed to save PDF');
    }

    // 8) Update stops table if stop_id provided
    if (stop_id) {
      const { error: updateError } = await supabase
        .from('stops')
        .update({ output_pdf_path: filePath })
        .eq('id', stop_id);
      
      if (updateError) {
        console.error('Error updating stop:', updateError);
      }
    }

    // 9) Get public URL
    const { data: urlData } = supabase.storage
      .from('manifests')
      .getPublicUrl(filePath);

    console.log('PDF generated successfully:', filePath);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: urlData.publicUrl,
        file_path: filePath,
        missing_fields: missing.length > 0 ? missing : undefined
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in generate-manifest-pdf:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate PDF'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);