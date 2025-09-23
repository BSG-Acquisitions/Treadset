import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGenerateAcroFormManifestV4 } from "@/hooks/useAcroFormManifestV4";
import { AcroFormManifestData } from "@/types/acroform-manifest";
import { getCurrentTemplateConfig } from "@/lib/pdf/templateConfig";

export interface ManifestIntegrationParams {
  manifestId: string;
  overrides?: Partial<AcroFormManifestData>;
}

// Convert manifest database data to AcroForm structure  
export const convertManifestToAcroForm = (manifestData: any, receiverData?: any): Record<string, string> => {
  const result = {
    manifest_number: manifestData.manifest_number || `M-${Date.now()}`,
    vehicle_trailer: `V-${manifestData.vehicle_id || '123'}`,
    
    // Generator (Client) information - use actual client data from database
    generator_name: manifestData.client?.company_name || '',
    generator_mail_address: manifestData.client?.mailing_address || manifestData.location?.address || '',
    generator_city: manifestData.client?.city || '',
    generator_state: manifestData.client?.state || '',
    generator_zip: manifestData.client?.zip || '',
    generator_physical_address: manifestData.client?.mailing_address || manifestData.location?.address || '',
    generator_physical_city: manifestData.client?.city || '',
    generator_physical_state: manifestData.client?.state || '',
    generator_physical_zip: manifestData.client?.zip || '',
    generator_county: manifestData.client?.county || '',
    generator_phone: manifestData.client?.phone || '',
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
    generator_print_name: manifestData.signed_by_name || manifestData.client?.contact_name || 'Generator Representative',
    generator_date: manifestData.signed_at ? new Date(manifestData.signed_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    generator_time: manifestData.signed_at ? new Date(manifestData.signed_at).toLocaleTimeString('en-US', { hour12: false }) : new Date().toLocaleTimeString('en-US', { hour12: false }),
    generator_signature: manifestData.customer_sig_path || '',

    // Hauler information - use actual hauler data from database
    hauler_mi_reg: manifestData.hauler?.hauler_mi_reg || '',
    hauler_other_id: '',
    hauler_name: manifestData.hauler?.hauler_name || '',
    hauler_mail_address: manifestData.hauler?.hauler_mailing_address || '',
    hauler_city: manifestData.hauler?.hauler_city || '',
    hauler_state: manifestData.hauler?.hauler_state || '',
    hauler_zip: manifestData.hauler?.hauler_zip || '',
    hauler_phone: manifestData.hauler?.hauler_phone || '',
    hauler_print_name: manifestData.signed_by_name || 'Hauler Representative',
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

    // Receiver information - prefer overrides; leave blank if not provided
    receiver_mi_reg: receiverData?.receiver_mi_reg || '',
    receiver_name: receiverData?.receiver_name || '',
    receiver_physical_address: receiverData?.receiver_mailing_address || '',
    receiver_city: receiverData?.receiver_city || '',
    receiver_state: receiverData?.receiver_state || '',
    receiver_zip: receiverData?.receiver_zip || '',
    receiver_phone: receiverData?.receiver_phone || '',
    receiver_print_name: manifestData.receiver_signed_by || 'Processor Representative',
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
    receiver_signature: manifestData.receiver_sig_path || ''
  };

  // Convert all values to strings, ensuring no undefined/null values
  const cleanResult: Record<string, string> = {};
  Object.entries(result).forEach(([key, value]) => {
    cleanResult[key] = value !== null && value !== undefined ? String(value) : '';
  });

  return cleanResult;
};

export const useManifestIntegration = () => {
  const { toast } = useToast();
  const generateAcroForm = useGenerateAcroFormManifestV4();

  return useMutation({
    mutationFn: async ({ manifestId, overrides }: ManifestIntegrationParams) => {
      // 1. Fetch manifest data with all related entities
      const { data: manifestData, error: fetchError } = await supabase
        .from('manifests')
        .select(`
          *,
          client:clients(*),
          location:locations(*),
          hauler:haulers(*),
          pickup:pickups!manifests_pickup_id_fkey(*)
        `)
        .eq('id', manifestId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Fetch default receiver data (since manifests don't have receiver_id FK)
      const { data: defaultReceiver } = await supabase
        .from('receivers')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      // 3. Build AcroForm data from DB record using the original working converter
      const acroFormData = convertManifestToAcroForm(manifestData, defaultReceiver);
      const mergedData = { ...acroFormData, ...(overrides || {}) };

      // Map domain field names to v4 template field names
      const config = getCurrentTemplateConfig();
      const templateFields: Record<string, string> = {};
      
      Object.entries(mergedData).forEach(([key, value]) => {
        const templateField = config.fieldMapping[key];
        if (templateField && value !== null && value !== undefined) {
          templateFields[templateField] = String(value);
        }
      });

      // Observability
      const populatedFieldCount = Object.keys(templateFields).length;
      console.log('[MANIFEST_INTEGRATION][v4] Restored working converter', {
        manifestId,
        populatedFieldCount,
        templateVersion: config.version,
      });
      
      if (populatedFieldCount === 0) {
        console.error('[MANIFEST_INTEGRATION][v4] manifest.v4.empty_payload', { manifestId });
        throw new Error('Aborting send: empty v4 manifest payload');
      }
      
      // Debug logging to see what data we have
      console.log('[MANIFEST_INTEGRATION] Raw manifest data:', {
        manifestId: manifestId,
        hasClient: !!manifestData.client,
        hasLocation: !!manifestData.location, 
        hasHauler: !!manifestData.hauler,
        clientCompany: manifestData.client?.company_name,
        manifestNumber: manifestData.manifest_number,
        tireCounts: {
          pte_off_rim: manifestData.pte_off_rim,
          pte_on_rim: manifestData.pte_on_rim,
          otr_count: manifestData.otr_count,
          tractor_count: manifestData.tractor_count
        }
      });
      
      console.log('[MANIFEST_INTEGRATION] v4 field map stats:', {
        populatedFieldCount,
      });
      
      // Generate the PDF using v4 template system  
      const acroFormResult = await generateAcroForm.mutateAsync({
        manifestData: templateFields as unknown as AcroFormManifestData,
        manifestId: manifestId,
        outputPath: `manifests/integrated-v4-${manifestId}-${Date.now()}.pdf`
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
        pdfPath: acroFormResult.pdfPath,
        templateVersion: 4
      };
    },
    onSuccess: (data) => {
      toast({
        title: "Manifest Generated",
        description: "v4 AcroForm manifest PDF created successfully with corrected field names."
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