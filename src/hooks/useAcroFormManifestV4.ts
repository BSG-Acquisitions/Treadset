import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AcroFormManifestData } from "@/types/acroform-manifest";
import { getCurrentTemplateConfig, writeIfExists } from "@/lib/pdf/templateConfig";

export interface GenerateAcroFormV4Params {
  manifestData: AcroFormManifestData;
  manifestId?: string;
  outputPath?: string;
  templateKeys?: string[]; // Available field names from template for validation
}

export const useGenerateAcroFormManifestV4 = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: GenerateAcroFormV4Params) => {
      const config = getCurrentTemplateConfig();
      
      // Convert AcroFormManifestData to exact template field names using template mapping
      const templateFields: Record<string, string> = {};
      const templateKeys = params.templateKeys || [];

      // Ensure we have data to work with
      if (!params.manifestData || typeof params.manifestData !== 'object') {
        throw new Error('No manifest data provided for PDF generation');
      }

      // Convert using template field mapping - each field gets mapped to exact template name
      Object.entries(config.fieldMapping).forEach(([domainKey, templateField]) => {
        const value = (params.manifestData as any)[domainKey];
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          // Only write if field exists in template (if templateKeys provided) or always write
          if (templateKeys.length === 0 || templateKeys.includes(templateField)) {
            templateFields[templateField] = String(value);
          } else if (templateKeys.length > 0) {
            console.warn(`[PDF_TEMPLATE_V${config.version}] Field "${templateField}" not found in template for key "${domainKey}"`);
          }
        }
      });

      console.log(`[PDF_TEMPLATE_V${config.version}] Mapped ${Object.keys(templateFields).length} fields for template`, {
        totalInputFields: Object.keys(params.manifestData).length,
        nonEmptyInputFields: Object.entries(params.manifestData).filter(([k,v]) => v && String(v).trim() !== '').length,
        mappedOutputFields: Object.keys(templateFields).length,
        templateFieldsAvailable: config.fieldMapping
      });

      const { data, error } = await supabase.functions.invoke(
        "generate-acroform-manifest",
        {
          body: {
            templatePath: config.templatePath,
            manifestData: templateFields,
            manifestId: params.manifestId,
            outputPath: params.outputPath,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const config = getCurrentTemplateConfig();
      toast({ 
        title: "Manifest Generated", 
        description: `v${config.version} AcroForm manifest PDF created successfully with ${data.fieldsProcessed} fields filled.` 
      });
      return data;
    },
    onError: (err: any) => {
      const config = getCurrentTemplateConfig();
      toast({
        title: "Generation Failed",
        description: err?.message ?? `Failed to generate v${config.version} AcroForm manifest PDF.`,
        variant: "destructive",
      });
    },
  });
};

// Legacy converter for backward compatibility - now uses template config
export const convertToAcroFormFields = (data: Partial<AcroFormManifestData>): Record<string, string> => {
  const config = getCurrentTemplateConfig();
  const fields: Record<string, string> = {};
  
  // Use template configuration for field mapping
  Object.entries(data).forEach(([key, value]) => {
    const templateField = config.fieldMapping[key];
    if (templateField && value !== null && value !== undefined && String(value).trim() !== '') {
      fields[templateField] = String(value);
    }
  });

  console.log(`[LEGACY_CONVERTER] Mapped ${Object.keys(fields).length} fields using template v${config.version}`);
  return fields;
};