import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AcroFormManifestData } from "@/types/acroform-manifest";

export interface GenerateAcroFormParams {
  templatePath: string;
  manifestData: Record<string, string>;
  manifestId?: string;
  outputPath?: string;
}

export const useGenerateAcroFormManifest = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: GenerateAcroFormParams) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-acroform-manifest",
        {
          body: {
            templatePath: params.templatePath,
            manifestData: params.manifestData,
            manifestId: params.manifestId,
            outputPath: params.outputPath,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: "Manifest Generated", 
        description: `AcroForm manifest PDF created successfully with ${data.fieldsProcessed} fields filled.` 
      });
    },
    onError: (err: any) => {
      toast({
        title: "Generation Failed",
        description: err?.message ?? "Failed to generate AcroForm manifest PDF.",
        variant: "destructive",
      });
    },
  });
};

// Helper function to convert AcroFormManifestData to field mapping
export const convertToAcroFormFields = (data: Partial<AcroFormManifestData>): Record<string, string> => {
  const fields: Record<string, string> = {};

  // Map data fields to AcroForm field names
  // Header fields
  if (data.manifest_number) fields['MANIFEST'] = data.manifest_number;
  if (data.vehicle_trailer) fields['VEHICLE_TRAILER'] = data.vehicle_trailer;

  // Part 1: Generator fields
  if (data.generator_name) fields['GEN_NAME'] = data.generator_name;
  if (data.generator_mail_address) fields['GEN_MAIL_ADDRESS'] = data.generator_mail_address;
  if (data.generator_city) fields['GEN_CITY'] = data.generator_city;
  if (data.generator_state) fields['GEN_STATE'] = data.generator_state;
  if (data.generator_zip) fields['GEN_ZIP'] = data.generator_zip;
  if (data.generator_physical_address) fields['GEN_PHYSICAL_ADDRESS'] = data.generator_physical_address;
  if (data.generator_physical_city) fields['GEN_PHYSICAL_CITY'] = data.generator_physical_city;
  if (data.generator_physical_state) fields['GEN_PHYSICAL_STATE'] = data.generator_physical_state;
  if (data.generator_physical_zip) fields['GEN_PHYSICAL_ZIP'] = data.generator_physical_zip;
  if (data.generator_county) fields['GEN_COUNTY'] = data.generator_county;
  if (data.generator_phone) fields['GEN_PHONE'] = data.generator_phone;
  if (data.generator_volume_weight) fields['GEN_VOLUME_WEIGHT'] = data.generator_volume_weight;
  if (data.generator_date_processed) fields['GEN_DATE_PROCESSED'] = data.generator_date_processed;
  if (data.generator_print_name) fields['GEN_PRINT_NAME'] = data.generator_print_name;
  if (data.generator_date) fields['GEN_DATE'] = data.generator_date;

  // Part 2: Hauler fields
  if (data.hauler_mi_reg) fields['HAULER_MI_REG'] = data.hauler_mi_reg;
  if (data.hauler_other_id) fields['HAULER_OTHER_ID'] = data.hauler_other_id;
  if (data.hauler_name) fields['HAULER_NAME'] = data.hauler_name;
  if (data.hauler_mail_address) fields['HAULER_MAIL_ADDRESS'] = data.hauler_mail_address;
  if (data.hauler_city) fields['HAULER_CITY'] = data.hauler_city;
  if (data.hauler_state) fields['HAULER_STATE'] = data.hauler_state;
  if (data.hauler_zip) fields['HAULER_ZIP'] = data.hauler_zip;
  if (data.hauler_phone) fields['HAULER_PHONE'] = data.hauler_phone;
  if (data.hauler_print_name) fields['HAULER_PRINT_NAME'] = data.hauler_print_name;
  if (data.hauler_date) fields['HAULER_DATE'] = data.hauler_date;
  if (data.hauler_gross_weight) fields['HAULER_GROSS_WEIGHT'] = data.hauler_gross_weight;
  if (data.hauler_tare_weight) fields['HAULER_TARE_WEIGHT'] = data.hauler_tare_weight;
  if (data.hauler_net_weight) fields['HAULER_NET_WEIGHT'] = data.hauler_net_weight;
  if (data.hauler_total_pte) fields['HAULER_TOTAL_PTE'] = data.hauler_total_pte;

  // Part 3: Receiver fields
  if (data.receiver_mi_reg) fields['RECEIVER_MI_REG'] = data.receiver_mi_reg;
  if (data.receiver_name) fields['RECEIVER_NAME'] = data.receiver_name;
  if (data.receiver_physical_address) fields['RECEIVER_PHYSICAL_ADDRESS'] = data.receiver_physical_address;
  if (data.receiver_city) fields['RECEIVER_CITY'] = data.receiver_city;
  if (data.receiver_state) fields['RECEIVER_STATE'] = data.receiver_state;
  if (data.receiver_zip) fields['RECEIVER_ZIP'] = data.receiver_zip;
  if (data.receiver_phone) fields['RECEIVER_PHONE'] = data.receiver_phone;
  if (data.receiver_print_name) fields['RECEIVER_PRINT_NAME'] = data.receiver_print_name;
  if (data.receiver_date) fields['RECEIVER_DATE'] = data.receiver_date;
  if (data.receiver_gross_weight) fields['RECEIVER_GROSS_WEIGHT'] = data.receiver_gross_weight;
  if (data.receiver_total_pte) fields['RECEIVER_TOTAL_PTE'] = data.receiver_total_pte;
  if (data.receiver_tare_weight) fields['RECEIVER_TARE_WEIGHT'] = data.receiver_tare_weight;
  if (data.receiver_net_weight) fields['RECEIVER_NET_WEIGHT'] = data.receiver_net_weight;

  return fields;
};