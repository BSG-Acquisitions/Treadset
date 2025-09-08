import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManifestRequest {
  pickup_id: string;
  calibrate?: boolean;
  manifest_data: {
    // Part 1 - Generator fields
    generator_name: string;
    generator_address: string;
    passenger_count: number;
    truck_count: number;
    oversized_count: number;
    pte_count: number;
    gross_weight: string;
    tare_weight: string;
    net_weight: string;
    generator_signature_name: string;
    generator_date: string;
    generator_signature: string;
    
    // Part 2 - Hauler fields
    hauler_name: string;
    hauler_address: string;
    hauler_license: string;
    vehicle_info: string;
    driver_name: string;
    driver_signature_name: string;
    hauler_date: string;
    hauler_signature: string;
    
    // Part 3 - Processor fields
    processor_name: string;
    processor_address: string;
    processor_license: string;
    processing_method: string;
    processor_signature_name: string;
    processor_date: string;
    processor_signature: string;
    
    // Legacy fields for compatibility
    client_name?: string;
    location_address?: string;
    pickup_date: string;
  };
}

// Configuration embedded directly (since edge functions can't read project files)
const MANIFEST_FIELDS = {
  "gen_name": { "source": "generator_name" },
  "gen_mail_addr": { "source": "generator_address" },
  "gen_phone": { "source": "generator_phone" },
  "gen_print_name": { "source": "generator_signature_name" },
  "gen_date": { "source": "generator_date", "format": "date" },
  "haul_reg": { "source": "hauler_license" },
  "haul_phone": { "source": "hauler_phone" },
  "haul_print_name": { "source": "driver_signature_name" },
  "haul_date": { "source": "hauler_date", "format": "date" },
  "recv_name": { "source": "processor_name" },
  "recv_addr": { "source": "processor_address" },
  "recv_phone": { "source": "processor_phone" },
  "recv_print_name": { "source": "processor_signature_name" },
  "recv_date": { "source": "processor_date", "format": "date" },
  "gross_weight": { "source": "gross_weight" },
  "tare_weight": { "source": "tare_weight" },
  "net_weight": { "source": "net_weight" },
  "total_pte": { "source": "pte_count", "format": "int" },
  "vehicleTrailer": { "source": "vehicle_info" }
};

const MANIFEST_LAYOUT = {
  "text": {
    "gen_name": { "x": 90, "y": 692, "fontSize": 10 },
    "gen_mail_addr": { "x": 90, "y": 677, "fontSize": 10 },
    "gen_mail_city": { "x": 90, "y": 662, "fontSize": 10 },
    "gen_mail_state": { "x": 280, "y": 662, "fontSize": 10 },
    "gen_mail_zip": { "x": 340, "y": 662, "fontSize": 10 },
    "gen_phys_addr": { "x": 90, "y": 632, "fontSize": 10 },
    "gen_phys_city": { "x": 90, "y": 617, "fontSize": 10 },
    "gen_phys_state": { "x": 280, "y": 617, "fontSize": 10 },
    "gen_phys_zip": { "x": 340, "y": 617, "fontSize": 10 },
    "gen_phone": { "x": 90, "y": 587, "fontSize": 10 },
    "gen_print_name": { "x": 320, "y": 572, "fontSize": 10 },
    "gen_date": { "x": 480, "y": 572, "fontSize": 10 },
    "haul_reg": { "x": 160, "y": 520, "fontSize": 10 },
    "haul_other_id": { "x": 420, "y": 520, "fontSize": 10 },
    "haul_phone": { "x": 160, "y": 475, "fontSize": 10 },
    "haul_print_name": { "x": 320, "y": 460, "fontSize": 10 },
    "haul_date": { "x": 480, "y": 460, "fontSize": 10 },
    "recv_name": { "x": 160, "y": 408, "fontSize": 10 },
    "recv_addr": { "x": 160, "y": 393, "fontSize": 10 },
    "recv_city": { "x": 160, "y": 378, "fontSize": 10 },
    "recv_state": { "x": 320, "y": 378, "fontSize": 10 },
    "recv_zip": { "x": 380, "y": 378, "fontSize": 10 },
    "recv_phone": { "x": 160, "y": 363, "fontSize": 10 },
    "recv_print_name": { "x": 320, "y": 318, "fontSize": 10 },
    "recv_date": { "x": 480, "y": 318, "fontSize": 10 },
    "gross_weight": { "x": 160, "y": 288, "fontSize": 10 },
    "tare_weight": { "x": 320, "y": 288, "fontSize": 10 },
    "net_weight": { "x": 480, "y": 288, "fontSize": 10 },
    "total_pte": { "x": 480, "y": 273, "fontSize": 10 },
    "vehicleTrailer": { "x": 90, "y": 742, "fontSize": 10 }
  },
  "signatures": {
    "generatorSig": { "x": 90, "y": 568, "w": 210, "h": 38 },
    "haulerSig": { "x": 90, "y": 456, "w": 210, "h": 38 },
    "receiverSig": { "x": 90, "y": 314, "w": 210, "h": 38 }
  }
};

// Format data based on field configuration
function formatValue(value: any, format?: string): string {
  if (value === null || value === undefined) return '';
  
  switch (format) {
    case 'int':
      return parseInt(value).toString();
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    case 'date':
      return new Date(value).toLocaleDateString();
    default:
      return value.toString();
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { pickup_id, manifest_data, calibrate }: ManifestRequest = await req.json();
    console.log('Processing manifest for pickup:', pickup_id);
    console.log('Calibrate mode:', Boolean(calibrate));
    console.log('Manifest data received:', JSON.stringify(manifest_data || {}, null, 2));

    console.log('Using embedded configuration');

    // Get the PDF template with fallbacks (use blank Letter page if missing)
    let templateData: Blob | null = null;
    let templateError: any = null;

    const primary = await supabase.storage.from('templates').download('STATE_Manifest_v1.pdf');
    if (!primary.error && primary.data) {
      templateData = primary.data as Blob;
    } else {
      templateError = primary.error;
      const fallback = await supabase.storage.from('manifests').download('templates/STATE_Manifest_v1.pdf');
      if (!fallback.error && fallback.data) {
        templateData = fallback.data as Blob;
        templateError = null;
      }
    }

    let pdfDoc: PDFDocument;
    let firstPage: any;
    if (templateData) {
      const templateBytes = await templateData.arrayBuffer();
      pdfDoc = await PDFDocument.load(templateBytes);
      firstPage = pdfDoc.getPages()[0];
    } else {
      console.warn('Template not found, using blank Letter page (612x792)');
      pdfDoc = await PDFDocument.create();
      firstPage = pdfDoc.addPage([612, 792]);
    }
    const { width, height } = firstPage.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Process overlays (calibration or actual data)
    if (calibrate) {
      // Draw light grid every 50pt
      for (let x = 0; x <= width; x += 50) {
        firstPage.drawRectangle({ x, y: 0, width: 0.5, height, color: rgb(0.85, 0.85, 0.85) });
      }
      for (let y = 0; y <= height; y += 50) {
        firstPage.drawRectangle({ x: 0, y, width, height: 0.5, color: rgb(0.85, 0.85, 0.85) });
      }
      // Crosshairs and labels for text fields
      for (const [fieldId, layoutConfig] of Object.entries(MANIFEST_LAYOUT.text)) {
        const x = (layoutConfig as any).x;
        const y = (layoutConfig as any).y;
        firstPage.drawRectangle({ x: x - 6, y: y - 0.5, width: 12, height: 1, color: rgb(1, 0, 0) });
        firstPage.drawRectangle({ x: x - 0.5, y: y - 6, width: 1, height: 12, color: rgb(1, 0, 0) });
        firstPage.drawText(String(fieldId), { x: x + 8, y: y + 8, size: 8, font, color: rgb(1, 0, 0) });
      }
      // Boxes for signature fields
      for (const [sigId, box] of Object.entries(MANIFEST_LAYOUT.signatures)) {
        const b = box as any;
        firstPage.drawRectangle({ x: b.x, y: b.y, width: b.w, height: b.h, borderColor: rgb(0, 0, 1), borderWidth: 1, color: rgb(0,0,0,0) as any });
        firstPage.drawText(String(sigId), { x: b.x + 4, y: b.y + b.h + 4, size: 8, font, color: rgb(0, 0, 1) });
      }
    } else {
      // Text overlays based on configuration
      for (const [fieldId, fieldConfig] of Object.entries(MANIFEST_FIELDS)) {
        if (typeof fieldConfig !== 'object' || !fieldConfig.source) continue;
        const layoutConfig = MANIFEST_LAYOUT.text[fieldId];
        if (!layoutConfig) continue;
        const rawValue = manifest_data[fieldConfig.source as keyof typeof manifest_data];
        const formattedValue = formatValue(rawValue, fieldConfig.format);
        if (formattedValue) {
          const fontSize = layoutConfig.fontSize || 10;
          const useFont = layoutConfig.bold ? boldFont : font;
          firstPage.drawText(formattedValue, {
            x: layoutConfig.x,
            y: layoutConfig.y,
            size: fontSize,
            font: useFont,
            color: rgb(0, 0, 0),
          });
        }
      }
      // Add signatures
      const signatures = [
        { data: manifest_data.generator_signature, config: MANIFEST_LAYOUT.signatures.generatorSig },
        { data: manifest_data.hauler_signature, config: MANIFEST_LAYOUT.signatures.haulerSig },
        { data: manifest_data.processor_signature, config: MANIFEST_LAYOUT.signatures.receiverSig }
      ];
      for (const sig of signatures) {
        if (sig.data && sig.config) {
          try {
            const sigBytes = Uint8Array.from(atob(sig.data.split(',')[1]), c => c.charCodeAt(0));
            const sigImage = await pdfDoc.embedPng(sigBytes);
            const sigDims = sigImage.scale(0.5);
            firstPage.drawImage(sigImage, {
              x: sig.config.x,
              y: sig.config.y,
              width: Math.min(sigDims.width, sig.config.w),
              height: Math.min(sigDims.height, sig.config.h),
            });
          } catch (sigError) {
            console.error('Signature embedding error:', sigError);
          }
        }
      }
    }

    const pdfBytes = await pdfDoc.save();

    // Upload completed manifest
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `manifest-${pickup_id}-${timestamp}.pdf`;
    const filePath = `manifests/${filename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('manifests')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error('Failed to save manifest');
    }

    const { data: urlData } = supabase.storage
      .from('manifests')
      .getPublicUrl(filePath);

    // Update pickup status
    await supabase
      .from('pickups')
      .update({
        manifest_pdf_path: filePath,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', pickup_id);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: urlData.publicUrl,
        file_path: filePath
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in manifest-finalize:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate manifest'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);