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
  meta?: {
    generator_signature_timestamp?: string;
    hauler_signature_timestamp?: string;
    receiver_signature_timestamp?: string;
  };
}

export const useGenerateAcroFormManifestV4 = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: GenerateAcroFormV4Params) => {
      const config = getCurrentTemplateConfig();
      const corrId = `v4-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

      // Build a canonical set of template field names from config mapping
      const templateKeysSet = new Set<string>(Object.values(config.fieldMapping));
      const missingTemplateKeys = new Set<string>();

      // Ensure we have data to work with
      if (!params.manifestData || typeof params.manifestData !== 'object') {
        console.error(`[PDF_TEMPLATE_V${config.version}] [${corrId}] No manifest data provided for PDF generation`);
        throw new Error('No manifest data provided for PDF generation');
      }

      // Convert to exact template field names
      // Accept either: (a) already template-keyed payload, or (b) domain-keyed payload that needs mapping
      const templateFields: Record<string, string> = {};

      Object.entries(params.manifestData).forEach(([key, value]) => {
        if (value === null || value === undefined) return; // allow ''

        // Case (a): Already a template field
        if (templateKeysSet.has(key)) {
          templateFields[key] = String(value);
          return;
        }

        // Case (b): Domain key → map via config
        const mapped = (config.fieldMapping as Record<string, string>)[key];
        if (mapped) {
          templateFields[mapped] = String(value);
          return;
        }

        // Unknown key
        missingTemplateKeys.add(key);
      });

      const populatedFieldCount = Object.keys(templateFields).length;
      if (templateKeysSet.size === 0) {
        console.error(`[PDF_TEMPLATE_V${config.version}] [${corrId}] templateKeysSet is empty; aborting to avoid empty payload`);
        throw new Error('Template keys not loaded for v4 template');
      }
      if (populatedFieldCount === 0) {
        console.error(`[PDF_TEMPLATE_V${config.version}] [${corrId}] manifest.v4.empty_payload`, {
          populatedFieldCount,
          inputKeys: Object.keys(params.manifestData).length,
          missingTemplateKeys: Array.from(missingTemplateKeys),
          templateVersion: config.version,
        });
        throw new Error('Aborting send: empty v4 manifest payload');
      }

      console.log(`[PDF_TEMPLATE_V${config.version}] [${corrId}] Prepared v4 payload`, {
        populatedFieldCount,
        missingTemplateKeys: Array.from(missingTemplateKeys),
        templateVersion: config.version,
      });

      const { data, error } = await supabase.functions.invoke(
        "generate-acroform-manifest",
        {
          body: {
            templatePath: config.templatePath,
            manifestData: templateFields,
            manifestId: params.manifestId,
            outputPath: params.outputPath,
            // Pass-through meta for non-template annotations (e.g., times)
            meta: {
              generator_time: (params.manifestData as any)?.generator_time,
              hauler_time: (params.manifestData as any)?.hauler_time,
              receiver_time: (params.manifestData as any)?.receiver_time,
              generator_signature_timestamp: params.meta?.generator_signature_timestamp,
              hauler_signature_timestamp: params.meta?.hauler_signature_timestamp,
              receiver_signature_timestamp: params.meta?.receiver_signature_timestamp,
            }
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
      const raw = err?.message || "Failed to generate PDF";
      const friendly = /non-?2xx|status code/i.test(raw)
        ? "PDF generation failed: template missing or storage access denied. Please retry or contact support."
        : raw;
      toast({
        title: "Generation Failed",
        description: friendly || `Failed to generate v${config.version} AcroForm manifest PDF.`,
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