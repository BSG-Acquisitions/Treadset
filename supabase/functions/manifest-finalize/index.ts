import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManifestRequest {
  pickup_id: string;
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
  "generatorName": { "source": "generator_name" },
  "generatorAddress": { "source": "generator_address" },
  "passengerTires": { "source": "passenger_count", "format": "int" },
  "truckTires": { "source": "truck_count", "format": "int" },
  "oversizedTires": { "source": "oversized_count", "format": "int" },
  "pteCount": { "source": "pte_count", "format": "int" },
  "grossWeight": { "source": "gross_weight" },
  "tareWeight": { "source": "tare_weight" },
  "netWeight": { "source": "net_weight" },
  "generatorSignature": { "source": "generator_signature_name" },
  "generatorDate": { "source": "generator_date", "format": "date" },
  "haulerName": { "source": "hauler_name" },
  "haulerAddress": { "source": "hauler_address" },
  "haulerLicense": { "source": "hauler_license" },
  "vehicleInfo": { "source": "vehicle_info" },
  "driverName": { "source": "driver_name" },
  "haulerSignature": { "source": "driver_signature_name" },
  "haulerDate": { "source": "hauler_date", "format": "date" },
  "processorName": { "source": "processor_name" },
  "processorAddress": { "source": "processor_address" },
  "processorLicense": { "source": "processor_license" },
  "processingMethod": { "source": "processing_method" },
  "processorSignature": { "source": "processor_signature_name" },
  "processorDate": { "source": "processor_date", "format": "date" }
};

const MANIFEST_LAYOUT = {
  "text": {
    "generatorName": { "x": 150, "y": 720, "fontSize": 10 },
    "generatorAddress": { "x": 150, "y": 705, "fontSize": 10 },
    "passengerTires": { "x": 200, "y": 680, "fontSize": 10, "align": "center" },
    "truckTires": { "x": 200, "y": 665, "fontSize": 10, "align": "center" },
    "oversizedTires": { "x": 200, "y": 650, "fontSize": 10, "align": "center" },
    "pteCount": { "x": 200, "y": 635, "fontSize": 10, "align": "center" },
    "grossWeight": { "x": 200, "y": 620, "fontSize": 10, "align": "center" },
    "tareWeight": { "x": 200, "y": 605, "fontSize": 10, "align": "center" },
    "netWeight": { "x": 200, "y": 590, "fontSize": 10, "align": "center" },
    "generatorSignature": { "x": 450, "y": 575, "fontSize": 9 },
    "generatorDate": { "x": 450, "y": 560, "fontSize": 9 },
    "haulerName": { "x": 150, "y": 520, "fontSize": 10 },
    "haulerAddress": { "x": 150, "y": 505, "fontSize": 10 },
    "haulerLicense": { "x": 150, "y": 490, "fontSize": 10 },
    "vehicleInfo": { "x": 150, "y": 475, "fontSize": 10 },
    "driverName": { "x": 150, "y": 460, "fontSize": 10 },
    "haulerSignature": { "x": 450, "y": 445, "fontSize": 9 },
    "haulerDate": { "x": 450, "y": 430, "fontSize": 9 },
    "processorName": { "x": 150, "y": 380, "fontSize": 10 },
    "processorAddress": { "x": 150, "y": 365, "fontSize": 10 },
    "processorLicense": { "x": 150, "y": 350, "fontSize": 10 },
    "processingMethod": { "x": 150, "y": 335, "fontSize": 10 },
    "processorSignature": { "x": 450, "y": 320, "fontSize": 9 },
    "processorDate": { "x": 450, "y": 305, "fontSize": 9 }
  },
  "signatures": {
    "generatorSig": { "x": 400, "y": 575, "w": 150, "h": 25 },
    "haulerSig": { "x": 400, "y": 445, "w": 150, "h": 25 },
    "processorSig": { "x": 400, "y": 320, "w": 150, "h": 25 }
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
    
    const { pickup_id, manifest_data }: ManifestRequest = await req.json();
    console.log('Processing manifest for pickup:', pickup_id);
    console.log('Manifest data received:', JSON.stringify(manifest_data, null, 2));

    console.log('Using embedded configuration');

    // Get the PDF template from the correct location
    const { data: templateData, error: templateError } = await supabase.storage
      .from('templates')
      .download('STATE_Manifest_v1.pdf');

    if (templateError || !templateData) {
      console.error('Template fetch error:', templateError);
      throw new Error('Failed to fetch PDF template');
    }

    const templateBytes = await templateData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Process text overlays based on configuration
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
        
        console.log(`Added text "${formattedValue}" at (${layoutConfig.x}, ${layoutConfig.y})`);
      }
    }

    // Add signatures
    const signatures = [
      { data: manifest_data.generator_signature, config: MANIFEST_LAYOUT.signatures.generatorSig },
      { data: manifest_data.hauler_signature, config: MANIFEST_LAYOUT.signatures.haulerSig },
      { data: manifest_data.processor_signature, config: MANIFEST_LAYOUT.signatures.processorSig }
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
          
          console.log(`Added signature at (${sig.config.x}, ${sig.config.y})`);
        } catch (sigError) {
          console.error('Signature embedding error:', sigError);
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