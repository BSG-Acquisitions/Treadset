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
    pte_off_rim: number;
    pte_on_rim: number;
    commercial_17_5_19_5_off: number;
    commercial_17_5_19_5_on: number;
    commercial_22_5_off: number;
    commercial_22_5_on: number;
    otr_count: number;
    tractor_count: number;
    weight_tons?: number;
    volume_yards?: number;
    customer_name: string;
    customer_title?: string;
    customer_email?: string;
    driver_name: string;
    driver_signature: string;
    customer_signature: string;
    client_name?: string;
    location_address?: string;
    pickup_date: string;
  };
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

    // Get the PDF template
    const { data: templateData, error: templateError } = await supabase.storage
      .from('manifests')
      .download('Templates /STATE_Manifest_v1.pdf');

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

    // Add data overlays to PDF (adjust coordinates for your actual form)
    firstPage.drawText(`BSG Tire Recycling - Manifest`, {
      x: 50, y: height - 50, size: 16, font: boldFont, color: rgb(0, 0, 0),
    });

    firstPage.drawText(`Client: ${manifest_data.client_name || 'N/A'}`, {
      x: 50, y: height - 80, size: 12, font, color: rgb(0, 0, 0),
    });

    firstPage.drawText(`Date: ${new Date(manifest_data.pickup_date).toLocaleDateString()}`, {
      x: 300, y: height - 80, size: 12, font, color: rgb(0, 0, 0),
    });

    // Tire counts
    let yPos = height - 150;
    firstPage.drawText(`TIRE INVENTORY`, {
      x: 50, y: yPos, size: 14, font: boldFont, color: rgb(0, 0, 0),
    });

    yPos -= 30;
    firstPage.drawText(`PTE Off Rim: ${manifest_data.pte_off_rim}  |  PTE On Rim: ${manifest_data.pte_on_rim}`, {
      x: 50, y: yPos, size: 11, font, color: rgb(0, 0, 0),
    });

    yPos -= 20;
    firstPage.drawText(`Commercial 17.5/19.5 Off: ${manifest_data.commercial_17_5_19_5_off}  |  On: ${manifest_data.commercial_17_5_19_5_on}`, {
      x: 50, y: yPos, size: 11, font, color: rgb(0, 0, 0),
    });

    yPos -= 20;
    firstPage.drawText(`Commercial 22.5 Off: ${manifest_data.commercial_22_5_off}  |  On: ${manifest_data.commercial_22_5_on}`, {
      x: 50, y: yPos, size: 11, font, color: rgb(0, 0, 0),
    });

    yPos -= 20;
    firstPage.drawText(`OTR: ${manifest_data.otr_count}  |  Tractor: ${manifest_data.tractor_count}`, {
      x: 50, y: yPos, size: 11, font, color: rgb(0, 0, 0),
    });

    // Signatures
    yPos = 150;
    firstPage.drawText(`SIGNATURES`, {
      x: 50, y: yPos, size: 14, font: boldFont, color: rgb(0, 0, 0),
    });

    yPos -= 30;
    firstPage.drawText(`Driver: ${manifest_data.driver_name}`, {
      x: 50, y: yPos, size: 11, font, color: rgb(0, 0, 0),
    });

    firstPage.drawText(`Customer: ${manifest_data.customer_name}`, {
      x: 300, y: yPos, size: 11, font, color: rgb(0, 0, 0),
    });

    // Embed signature images
    try {
      if (manifest_data.driver_signature) {
        const driverSigBytes = Uint8Array.from(atob(manifest_data.driver_signature.split(',')[1]), c => c.charCodeAt(0));
        const driverSigImage = await pdfDoc.embedPng(driverSigBytes);
        const driverSigDims = driverSigImage.scale(0.3);
        
        firstPage.drawImage(driverSigImage, {
          x: 50, y: yPos - 50, width: driverSigDims.width, height: driverSigDims.height,
        });
      }

      if (manifest_data.customer_signature) {
        const customerSigBytes = Uint8Array.from(atob(manifest_data.customer_signature.split(',')[1]), c => c.charCodeAt(0));
        const customerSigImage = await pdfDoc.embedPng(customerSigBytes);
        const customerSigDims = customerSigImage.scale(0.3);
        
        firstPage.drawImage(customerSigImage, {
          x: 300, y: yPos - 50, width: customerSigDims.width, height: customerSigDims.height,
        });
      }
    } catch (sigError) {
      console.error('Signature embedding error:', sigError);
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