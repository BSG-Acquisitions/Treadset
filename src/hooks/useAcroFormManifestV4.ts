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
      
      // Convert AcroFormManifestData to exact template field names
      const templateFields: Record<string, string> = {};
      const templateKeys = params.templateKeys || [];

      // Use writeIfExists to only write fields that exist in the template
      Object.entries(params.manifestData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          writeIfExists(templateKeys, key, String(value), templateFields);
        }
      });

      console.log(`[PDF_TEMPLATE_V${config.version}] Mapped ${Object.keys(templateFields).length} fields for template`);

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