import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FieldExtractionRequest {
  templatePath: string; // e.g., "Michigan_Manifest_AcroForm_V4.pdf"
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
    const body: FieldExtractionRequest = await req.json();
    console.log('Extracting fields from template:', body.templatePath);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the template
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
          path: templatePath
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load the PDF and extract field information
    const templateBytes = await templateFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    
    const fields = form.getFields();
    console.log(`Found ${fields.length} form fields in template`);

    // Group fields by section based on naming patterns
    const fieldsBySection: Record<string, string[]> = {
      header: [],
      generator: [],
      hauler: [],
      receiver: [],
      weights: [],
      signatures: [],
      other: []
    };

    const allFieldNames: string[] = [];
    const fieldDetails: Array<{
      name: string;
      type: string;
      section: string;
      hasDefault: boolean;
      readOnly: boolean;
    }> = [];

    fields.forEach(field => {
      const name = field.getName();
      const type = field.constructor.name;
      allFieldNames.push(name);
      
      // Categorize field by name patterns
      let section = 'other';
      const lowerName = name.toLowerCase();
      
      if (lowerName.includes('manifest') || lowerName.includes('vehicle') || lowerName.includes('trailer')) {
        section = 'header';
      } else if (lowerName.includes('generator') || lowerName.includes('physical')) {
        section = 'generator';
      } else if (lowerName.includes('hauler') || lowerName.includes('scrap_tire')) {
        section = 'hauler';
      } else if (lowerName.includes('receiver') || lowerName.includes('processor') || lowerName.includes('collection_site')) {
        section = 'receiver';
      } else if (lowerName.includes('gross') || lowerName.includes('tare') || lowerName.includes('net') || 
                 lowerName.includes('tire') || lowerName.includes('passenger') || lowerName.includes('truck') || 
                 lowerName.includes('oversized')) {
        section = 'weights';
      } else if (lowerName.includes('signature') || lowerName.includes('print') || lowerName.includes('date') || 
                 lowerName.includes('_es_:signer:')) {
        section = 'signatures';
      }
      
      fieldsBySection[section].push(name);
      
      // Get field properties
      let hasDefault = false;
      let readOnly = false;
      
      try {
        // Access field properties through the any type to avoid typescript issues
        const anyField = field as any;
        hasDefault = !!(anyField.getDefaultValue?.() || anyField.defaultValue);
        readOnly = !!(anyField.isReadOnly?.() || anyField.readOnly);
      } catch (e) {
        // Ignore property access errors
      }
      
      fieldDetails.push({
        name,
        type,
        section,
        hasDefault,
        readOnly
      });
    });

    // Create comprehensive field analysis
    const analysis = {
      templatePath: body.templatePath,
      totalFields: fields.length,
      extractedAt: new Date().toISOString(),
      fieldsBySection,
      allFieldNames: allFieldNames.sort(),
      fieldDetails: fieldDetails.sort((a, b) => a.name.localeCompare(b.name)),
      sectionSummary: Object.entries(fieldsBySection).map(([section, fieldNames]) => ({
        section,
        count: fieldNames.length,
        fields: fieldNames.sort()
      }))
    };

    console.log('Field extraction complete:', {
      totalFields: analysis.totalFields,
      sections: Object.keys(fieldsBySection).map(section => 
        `${section}: ${fieldsBySection[section].length}`
      ).join(', ')
    });

    return new Response(
      JSON.stringify(analysis, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error extracting AcroForm fields:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Field extraction failed', 
        details: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);