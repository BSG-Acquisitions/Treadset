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

    // 6) Apply overlays
    for (const cal of calibrations) {
      const value = overlay_data[cal.field_name];
      if (value == null || value === undefined) continue;

      const pageIndex = (cal.page || 1) - 1;
      if (pageIndex >= pages.length) {
        console.warn(`Page ${cal.page} not found in PDF, skipping field ${cal.field_name}`);
        continue;
      }

      const page = pages[pageIndex];
      const fontSize = cal.font_size || 10;

      // Page dimensions and coordinate transformation
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const srcW = (typeof source_width === 'number' && source_width > 0) ? source_width : globalMaxX;
      const srcH = (typeof source_height === 'number' && source_height > 0) ? source_height : globalMaxY;
      const mode = coordinate_mode || ((globalMaxX > pageWidth * 1.2 || globalMaxY > pageHeight * 1.2) ? 'top-left' : 'bottom-left');
      let scaleX = srcW ? pageWidth / srcW : 1;
      let scaleY = srcH ? pageHeight / srcH : 1;
      if (typeof scale_x === 'number' && scale_x > 0) scaleX *= scale_x;
      if (typeof scale_y === 'number' && scale_y > 0) scaleY *= scale_y;
      const drawXBase = Number(cal.x) * scaleX;
      const yRaw = Number(cal.y) * scaleY;
      const drawYBase = mode === 'top-left' ? (pageHeight - yRaw) : yRaw;
      const finalX = drawXBase + (offset_x || 0);
      const finalY = drawYBase + (offset_y || 0);

      // Optional visual guides for calibration
      if (draw_guides) {
        page.drawRectangle({
          x: finalX - 1,
          y: finalY - 1,
          width: 2,
          height: 2,
          color: rgb(1, 0, 0),
          borderColor: rgb(1, 0, 0),
          borderWidth: 0,
        });
        page.drawText(cal.field_name, {
          x: finalX + 3,
          y: finalY + 3,
          size: 6,
          font: font,
          color: rgb(1, 0, 0),
        });
      }

      // Check if value is an image path or data URL
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
          const imageScale = 0.5; // Adjust as needed
          const imageDims = image.scale(imageScale);
          
          page.drawImage(image, {
            x: finalX,
            y: finalY,
            width: Math.min(imageDims.width, 200), // Max width 200pt
            height: Math.min(imageDims.height, 100), // Max height 100pt
          });
        } catch (imageError) {
          console.error(`Error embedding image for ${cal.field_name}:`, imageError);
          // Fall back to drawing the text value
          page.drawText(String(value), {
            x: finalX,
            y: finalY,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
        }
      } else {
        // Draw text
        page.drawText(String(value), {
          x: drawX,
          y: drawY,
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