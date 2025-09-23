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
export const convertManifestToAcroForm = (manifestData: any, receiverData?: any): Partial<AcroFormManifestData> => {
  return {
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

      // Build exact v4 template field map from DB record and apply overrides via template mapping
      const config = getCurrentTemplateConfig();
      const templateKeysSet = new Set<string>(Object.values(config.fieldMapping));
      const missingTemplateKeys = new Set<string>();
      const out: Record<string, string> = {};
      const put = (key: string, val: unknown) => {
        if (val === null || val === undefined) return; // allow '' and 0
        const s = typeof val === 'string' ? val : String(val);
        if (!templateKeysSet.has(key)) { missingTemplateKeys.add(key); return; }
        out[key] = s;
      };

      // Header
      put('Manifest_Number', manifestData.manifest_number || `M-${Date.now()}`);
      put('Vehicle_Trailer', `V-${manifestData.vehicle_id || '123'}`);

      // Generator (Client) mailing and physical (copy mailing → physical if physical unknown)
      const mailingAddress = manifestData.client?.mailing_address || manifestData.location?.address || '';
      const genCity = manifestData.client?.city || '';
      const genState = manifestData.client?.state || '';
      const genZip = manifestData.client?.zip || '';

      put('Generator_Name', manifestData.client?.company_name || '');
      put('Generator_Mailing_Address', mailingAddress);
      put('Generator_City', genCity);
      put('Generator_State', genState);
      put('Generator_Zip', genZip);
      put('Generator_County', manifestData.client?.county || '');
      put('Generator_Phone', manifestData.client?.phone || '');

      put('Physical_Mailing_Address', mailingAddress);
      put('Physical_City', genCity);
      put('Physical_State', genState);
      put('Physical_Zip', genZip);

      // Tire counts (state compliance)
      const passenger = (manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0);
      const trucks = ((manifestData.commercial_17_5_19_5_off || 0) + (manifestData.commercial_17_5_19_5_on || 0) +
                      (manifestData.commercial_22_5_off || 0) + (manifestData.commercial_22_5_on || 0));
      const oversized = (manifestData.otr_count || 0) + (manifestData.tractor_count || 0);
      const totalPTE = passenger + (trucks * 5) + (oversized * 15);
      put('Passenger_Car', passenger);
      put('Truck', trucks);
      put('Oversized', oversized);
      put('Passenger_Tire_Equivalents', totalPTE);

      // Generator signatures/dates
      const genDate = manifestData.signed_at ? new Date(manifestData.signed_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      put('Generator_Print_Name', manifestData.signed_by_name || manifestData.client?.contact_name || 'Generator Representative');
      put('Generator_Date', genDate);
      put('Generator_Signature _es_:signer:signature', manifestData.customer_sig_path || '');

      // Hauler
      put('MI_SCRAP_TIRE_HAULER_REG_', manifestData.hauler?.hauler_mi_reg || '');
      put('Collection_Site_Reg_#', '');
      put('Hauler_Name', manifestData.hauler?.hauler_name || '');
      put('Hauler_Address', manifestData.hauler?.hauler_mailing_address || '');
      put('Hauler_City', manifestData.hauler?.hauler_city || '');
      put('Hauler_State', manifestData.hauler?.hauler_state || '');
      put('Hauler_Zip', manifestData.hauler?.hauler_zip || '');
      put('Hauler_Phone', manifestData.hauler?.hauler_phone || '');
      put('Hauler_Print_Name', manifestData.signed_by_name || 'Hauler Representative');
      const haulerDate = genDate;
      put('Hauler_Date', haulerDate);
      put('Hauler_Signature _es_:signer:signature', manifestData.driver_sig_path || '');
      put('Gross', '');
      put('Tare', '');
      put('Net_Weight', '');

      // Receiver
      put('Receiver_Name', manifestData.receiver_signed_by || 'Processor Representative');
      put('Receiver_Address', '');
      put('Receiver_City', '');
      put('Receiver_State', '');
      put('Receiver_Zip', '');
      put('Receiver_Phone', '');
      const recvDate = manifestData.receiver_signed_at ? new Date(manifestData.receiver_signed_at).toISOString().split('T')[0] : '';
      put('Processor_Print_Name', manifestData.receiver_signed_by || '');
      put('Processor_Date', recvDate);
      put('Processor_Signature _es_:signer:signature', manifestData.receiver_sig_path || '');

      // Apply overrides by mapping domain keys → template keys using config
      if (overrides) {
        Object.entries(overrides).forEach(([k, v]) => {
          if (v === null || v === undefined) return;
          const tf = (config.fieldMapping as Record<string, string>)[k];
          if (tf) put(tf, v);
        });
      }

      // Observability
      const populatedFieldCount = Object.keys(out).length;
      console.log('[MANIFEST_INTEGRATION][v4] Prepared field map', {
        manifestId,
        populatedFieldCount,
        missingTemplateKeys: Array.from(missingTemplateKeys),
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
        manifestData: out as unknown as AcroFormManifestData,
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