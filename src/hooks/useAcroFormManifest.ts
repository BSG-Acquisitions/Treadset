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
      return data; // Return data so it can be used by the caller
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

  // Map data fields to actual AcroForm field names from the PDF
  // Header fields
  if (data.manifest_number) fields['MANIFEST_#'] = data.manifest_number;
  if (data.vehicle_trailer) fields['VEHICLETRAILER'] = data.vehicle_trailer;

  // Part 1: Generator fields
  if (data.generator_name) fields['Generator_Name'] = data.generator_name;
  if (data.generator_mail_address) fields['Generator_Mailing_Address'] = data.generator_mail_address;
  if (data.generator_city) fields['Generator_City'] = data.generator_city;
  if (data.generator_state) fields['Generator_State'] = data.generator_state;
  if (data.generator_zip) fields['Generator_Zip'] = data.generator_zip;
  if (data.generator_physical_address) fields['PHYSICAL_ADDRESS_WHERE_TIRES_WERE_REMOVED'] = data.generator_physical_address;
  if (data.generator_physical_city) fields['Generator_City'] = data.generator_physical_city; // May be same as mailing city
  if (data.generator_physical_state) fields['Generator_State'] = data.generator_physical_state; // May be same as mailing state  
  if (data.generator_physical_zip) fields['Generator_Zip'] = data.generator_physical_zip; // May be same as mailing zip
  if (data.generator_county) fields['Generator_County'] = data.generator_county;
  if (data.generator_phone) fields['Generator_Phone'] = data.generator_phone;
  // Individual tire type fields for Michigan Manifest
  if (data.passenger_car_count) fields['Passenger_Car'] = String(data.passenger_car_count);
  if (data.truck_count) fields['Truck'] = String(data.truck_count);  
  if (data.oversized_count) fields['Oversized'] = String(data.oversized_count);
  
  // Total PTE calculation
  if (data.generator_volume_weight) fields['Passenger tire equivalents'] = data.generator_volume_weight;
  if (data.generator_date_processed) fields['Generator_Date'] = data.generator_date_processed;
  if (data.generator_print_name) fields['Generator_Print_Name'] = data.generator_print_name;
  if (data.generator_date) {
    fields['Generator_Date'] = data.generator_time 
      ? `${data.generator_date} ${data.generator_time}` 
      : data.generator_date;
  }

  // Part 2: Hauler fields  
  if (data.hauler_mi_reg) fields['MI_SCRAP_TIR _HAULER_REG_#'] = data.hauler_mi_reg;
  if (data.hauler_other_id) fields['Collection_Site_Reg_#'] = data.hauler_other_id;
  if (data.hauler_name) fields['Hauler_Name'] = data.hauler_name;
  if (data.hauler_mail_address) fields['Hauler_Address'] = data.hauler_mail_address;
  if (data.hauler_city) fields['Hauler_City'] = data.hauler_city;
  if (data.hauler_state) fields['Hauler_State'] = data.hauler_state;
  if (data.hauler_zip) fields['Hauler_Zip'] = data.hauler_zip;
  if (data.hauler_phone) fields['Hauler_Phone'] = data.hauler_phone;
  if (data.hauler_print_name) fields['Hauler_Print_Name'] = data.hauler_print_name;
  if (data.hauler_date) {
    fields['Hauler_Date'] = data.hauler_time 
      ? `${data.hauler_date} ${data.hauler_time}` 
      : data.hauler_date;
  }
  if (data.hauler_gross_weight) fields['Gross'] = data.hauler_gross_weight;
  if (data.hauler_tare_weight) fields['Tare'] = data.hauler_tare_weight;
  if (data.hauler_net_weight) fields['Net_Weight'] = data.hauler_net_weight;
  if (data.hauler_total_pte) fields['Passenger tire equivalents'] = data.hauler_total_pte;

  // Part 3: Receiver fields
  if (data.receiver_mi_reg) fields['Collection_Site_Reg_#'] = data.receiver_mi_reg;
  if (data.receiver_name) fields['Receiver_Name'] = data.receiver_name;
  if (data.receiver_physical_address) fields['Receiver_Address'] = data.receiver_physical_address;
  if (data.receiver_city) fields['Receiver_City'] = data.receiver_city;
  if (data.receiver_state) fields['Reciever_State'] = data.receiver_state; // Note: PDF has typo "Reciever"
  if (data.receiver_zip) fields['Receiver_Zip'] = data.receiver_zip;
  if (data.receiver_phone) fields['Reciever_Phone'] = data.receiver_phone; // Note: PDF has typo "Reciever"
  if (data.receiver_print_name) fields['Processor_Print_Name'] = data.receiver_print_name;
  if (data.receiver_date) {
    fields['Processor_Date'] = data.receiver_time 
      ? `${data.receiver_date} ${data.receiver_time}` 
      : data.receiver_date;
  }
  if (data.receiver_gross_weight) fields['Gross'] = data.receiver_gross_weight;
  if (data.receiver_total_pte) fields['Passenger tire equivalents'] = data.receiver_total_pte;
  if (data.receiver_tare_weight) fields['Tare'] = data.receiver_tare_weight;
  if (data.receiver_net_weight) fields['Net_Weight'] = data.receiver_net_weight;

  // Signature fields - these will be handled by the Edge Function as image overlays
  if (data.generator_signature) fields['Generator_Signature'] = data.generator_signature;
  if (data.hauler_signature) fields['Hauler_Signature'] = data.hauler_signature;
  if (data.receiver_signature) fields['Receiver_Signature'] = data.receiver_signature;

  return fields;
};