import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGenerateAcroFormManifest, convertToAcroFormFields } from "@/hooks/useAcroFormManifest";
import { AcroFormManifestData } from "@/types/acroform-manifest";

export interface ManifestIntegrationParams {
  manifestId: string;
  overrides?: Partial<AcroFormManifestData>;
}

// Convert manifest database data to AcroForm structure
export const convertManifestToAcroForm = (manifestData: any): Partial<AcroFormManifestData> => {
  return {
    manifest_number: manifestData.manifest_number || `M-${Date.now()}`,
    vehicle_trailer: `V-${manifestData.vehicle_id || '123'}`,
    
    // Generator (Client) information
    generator_name: manifestData.client?.company_name || 'Generator',
    generator_mail_address: manifestData.location?.address || manifestData.client?.mailing_address || '2971 Bellevue Street',
    generator_city: manifestData.client?.city || 'Detroit',
    generator_state: manifestData.client?.state || 'MI',
    generator_zip: manifestData.client?.zip || '48207',
    generator_physical_address: manifestData.location?.address || manifestData.client?.physical_address || '2971 Bellevue Street',
    generator_physical_city: manifestData.client?.city || 'Detroit',
    generator_physical_state: manifestData.client?.state || 'MI',
    generator_physical_zip: manifestData.client?.zip || '48207',
    generator_county: manifestData.client?.county || 'Wayne',
    generator_phone: manifestData.client?.phone || '(734) 415-6528',
    generator_volume_weight: (() => {
      // Calculate total PTE from individual tire types using simplified PTE system
      const passengerPTE = (manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0);
      const truckPTE = ((manifestData.commercial_17_5_19_5_off || 0) + (manifestData.commercial_17_5_19_5_on || 0) + 
                       (manifestData.commercial_22_5_off || 0) + (manifestData.commercial_22_5_on || 0)) * 5; // Each truck tire = 5 PTE
      const oversizedPTE = (manifestData.otr_count || 0) * 15 + (manifestData.tractor_count || 0) * 15; // OTR = 15 PTE, Tractor = 15 PTE
      return (passengerPTE + truckPTE + oversizedPTE).toString();
    })(),
    
    // Individual tire counts for manifest fields
    passenger_car_count: ((manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0)).toString(),
    truck_count: (((manifestData.commercial_17_5_19_5_off || 0) + (manifestData.commercial_17_5_19_5_on || 0)) + 
                 ((manifestData.commercial_22_5_off || 0) + (manifestData.commercial_22_5_on || 0))).toString(),
    oversized_count: ((manifestData.otr_count || 0) + (manifestData.tractor_count || 0)).toString(),
    generator_date_processed: new Date().toISOString().split('T')[0],
    generator_print_name: manifestData.signed_by_name || manifestData.client?.contact_name || 'Generator Rep',
    generator_date: manifestData.signed_at ? new Date(manifestData.signed_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    generator_time: manifestData.signed_at ? new Date(manifestData.signed_at).toLocaleTimeString('en-US', { hour12: false }) : new Date().toLocaleTimeString('en-US', { hour12: false }),
    generator_signature: manifestData.customer_sig_path || '',

    // Hauler information (BSG Logistics)
    hauler_mi_reg: 'H123456',
    hauler_other_id: '',
    hauler_name: 'BSG Logistics',
    hauler_mail_address: '100 Industrial Blvd',
    hauler_city: 'Detroit',
    hauler_state: 'MI',
    hauler_zip: '48210',
    hauler_phone: '(734) 415-6528',
    hauler_print_name: manifestData.signed_by_name || 'hauler ',
    hauler_date: manifestData.signed_at ? new Date(manifestData.signed_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    hauler_time: manifestData.signed_at ? new Date(manifestData.signed_at).toLocaleTimeString('en-US', { hour12: false }) : new Date().toLocaleTimeString('en-US', { hour12: false }),
    hauler_gross_weight: (manifestData.gross_weight || manifestData.weight_tons || '').toString(),
    hauler_tare_weight: (manifestData.tare_weight || '').toString(), 
    hauler_net_weight: (manifestData.net_weight || manifestData.weight_tons || '').toString(),
    hauler_total_pte: (() => {
      // Same total PTE calculation as generator using simplified PTE system
      const passengerPTE = (manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0);
      const truckPTE = ((manifestData.commercial_17_5_19_5_off || 0) + (manifestData.commercial_17_5_19_5_on || 0) + 
                       (manifestData.commercial_22_5_off || 0) + (manifestData.commercial_22_5_on || 0)) * 5; // Each truck tire = 5 PTE
      const oversizedPTE = (manifestData.otr_count || 0) * 15 + (manifestData.tractor_count || 0) * 15; // OTR = 15 PTE, Tractor = 15 PTE
      return (passengerPTE + truckPTE + oversizedPTE).toString();
    })(),
    hauler_signature: manifestData.driver_sig_path || '',

    // Receiver information (Processing facility)
    receiver_mi_reg: 'R-67890',
    receiver_name: 'BSG Tire Recycling Center',
    receiver_physical_address: '2971 Bellevue Street',
    receiver_city: 'Detroit',
    receiver_state: 'MI',
    receiver_zip: '48207',
    receiver_phone: '(734) 415-6528',
    receiver_print_name: 'BSG Processor',
    receiver_date: manifestData.receiver_signed_at ? new Date(manifestData.receiver_signed_at).toISOString().split('T')[0] : '',
    receiver_time: manifestData.receiver_signed_at ? new Date(manifestData.receiver_signed_at).toLocaleTimeString('en-US', { hour12: false }) : '',
    receiver_gross_weight: '',
    receiver_total_pte: (() => {
      // Same total PTE calculation as generator and hauler using simplified PTE system
      const passengerPTE = (manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0);
      const truckPTE = ((manifestData.commercial_17_5_19_5_off || 0) + (manifestData.commercial_17_5_19_5_on || 0) + 
                       (manifestData.commercial_22_5_off || 0) + (manifestData.commercial_22_5_on || 0)) * 5; // Each truck tire = 5 PTE
      const oversizedPTE = (manifestData.otr_count || 0) * 15 + (manifestData.tractor_count || 0) * 15; // OTR = 15 PTE, Tractor = 15 PTE
      return (passengerPTE + truckPTE + oversizedPTE).toString();
    })(),
    receiver_tare_weight: '',
    receiver_net_weight: '',
    receiver_signature: manifestData.receiver_sig_path || '' // This would need to be added to manifest creation
  };
};

export const useManifestIntegration = () => {
  const { toast } = useToast();
  const generateAcroForm = useGenerateAcroFormManifest();

  return useMutation({
    mutationFn: async ({ manifestId, overrides }: ManifestIntegrationParams) => {
      // 1. Fetch manifest data from database
      const { data: manifestData, error: fetchError } = await supabase
        .from('manifests')
        .select(`*`)
        .eq('id', manifestId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Generate AcroForm PDF (merge overrides from UI when provided)
      const acroFormData = convertManifestToAcroForm(manifestData);
      const mergedData = { ...acroFormData, ...(overrides || {}) };
      const acroFormFields = convertToAcroFormFields(mergedData);
      
      const acroFormResult = await generateAcroForm.mutateAsync({
        templatePath: 'Michigan_Manifest_AcroForm.pdf', // Correct filename with uppercase 'F'
        manifestData: acroFormFields,
        manifestId: manifestId,
        outputPath: `manifests/acroform-${manifestId}-${Date.now()}.pdf`
      });

      // 3. Update manifest with AcroForm PDF path (keep status as AWAITING_RECEIVER_SIGNATURE)
      const { error: updateError } = await supabase
        .from('manifests')
        .update({ 
          acroform_pdf_path: acroFormResult.pdfPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', manifestId);

      if (updateError) throw updateError;

      return {
        success: true,
        pdfUrl: acroFormResult.pdfUrl,
        pdfPath: acroFormResult.pdfPath
      };
    },
    onSuccess: (data) => {
      toast({
        title: "Manifest Generated",
        description: "State compliant manifest PDF created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error?.message || "Failed to generate manifest PDF.",
        variant: "destructive"
      });
    }
  });
};