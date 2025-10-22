import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGenerateAcroFormManifestV4 } from "@/hooks/useAcroFormManifestV4";
import { AcroFormManifestData } from "@/types/acroform-manifest";
import { getCurrentTemplateConfig } from "@/lib/pdf/templateConfig";
import { MICHIGAN_CONVERSIONS } from "@/lib/michigan-conversions";
import { validateAcroFormData, sanitizeAcroFormData, logValidationResults } from "@/lib/manifestValidation";
import { createPrintNameWithTimestamp } from "@/lib/manifestTimestamps";

export interface ManifestIntegrationParams {
  manifestId: string;
  overrides?: Partial<AcroFormManifestData>;
}

// Convert manifest database data to AcroForm structure  
export const convertManifestToAcroForm = (manifestData: any, receiverData?: any): Record<string, string> => {
  // Fallback parser for "City ST [ZIP]" at end of an address line
  const parseCityStateZip = (addr: string | undefined | null) => {
    const res = { city: '', state: '', zip: '' };
    if (!addr) return res;
    const m = String(addr).match(/([^,\n]*)[,\s]+([A-Za-z .'-]+)\s+([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/);
    if (m) {
      res.city = (m[2] || '').trim();
      res.state = (m[3] || '').trim();
      res.zip = (m[4] || '').trim();
    } else {
      // Try simpler "... City ST" without comma/zip
      const m2 = String(addr).match(/([A-Za-z .'-]+)\s+([A-Z]{2})$/);
      if (m2) {
        res.city = (m2[1] || '').trim();
        res.state = (m2[2] || '').trim();
      }
    }
    return res;
  };

  const mailingAddress = manifestData.client?.mailing_address || manifestData.location?.address || '';
  const mailParsed = parseCityStateZip(mailingAddress);
  const physicalAddress = manifestData.client?.physical_address || manifestData.location?.address || mailingAddress;
  const physParsed = parseCityStateZip(physicalAddress);

  const result = {
    manifest_number: manifestData.manifest_number || `M-${Date.now()}`,
    vehicle_trailer: `V-${manifestData.vehicle_id || '123'}`,
    
    // Generator (Client) information - prefer structured client fields, fallback to parsed address tail
    generator_name: manifestData.client?.company_name || '',
    generator_mail_address: mailingAddress,
    generator_city: manifestData.client?.city || mailParsed.city || '',
    generator_state: manifestData.client?.state || mailParsed.state || '',
    generator_zip: manifestData.client?.zip || mailParsed.zip || '',
    generator_physical_address: physicalAddress,
    generator_physical_city: manifestData.client?.physical_city || physParsed.city || manifestData.client?.city || mailParsed.city || '',
    generator_physical_state: manifestData.client?.physical_state || physParsed.state || manifestData.client?.state || mailParsed.state || '',
    generator_physical_zip: manifestData.client?.physical_zip || physParsed.zip || manifestData.client?.zip || mailParsed.zip || '',
    generator_county: manifestData.client?.county || '',
    generator_phone: manifestData.client?.phone || '',
    generator_volume_weight: (() => {
      // Calculate total PTE using Michigan conversion constants
      const passengerPTE = ((manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0)) * MICHIGAN_CONVERSIONS.PASSENGER_TIRE_TO_PTE;
      const truckCount = (manifestData.commercial_17_5_19_5_off || 0) + (manifestData.commercial_17_5_19_5_on || 0) +
                         (manifestData.commercial_22_5_off || 0) + (manifestData.commercial_22_5_on || 0);
      const truckPTE = truckCount * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;
      const oversizedCount = (manifestData.otr_count || 0) + (manifestData.tractor_count || 0);
      const oversizedPTE = oversizedCount * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE;
      return (passengerPTE + truckPTE + oversizedPTE).toString();
    })(),
    
    // Individual tire counts for manifest fields
    passenger_car_count: ((manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0)).toString(),
    truck_count: (((manifestData.commercial_17_5_19_5_off || 0) + (manifestData.commercial_17_5_19_5_on || 0)) + 
                 ((manifestData.commercial_22_5_off || 0) + (manifestData.commercial_22_5_on || 0))).toString(),
    oversized_count: ((manifestData.otr_count || 0) + (manifestData.tractor_count || 0)).toString(),
    generator_date_processed: new Date().toISOString().split('T')[0],
    generator_print_name: createPrintNameWithTimestamp(
      manifestData.signed_by_name || manifestData.client?.contact_name,
      manifestData.generator_signed_at || manifestData.signed_at,
      'Generator Representative'
    ),
    generator_date: manifestData.generator_signed_at ? new Date(manifestData.generator_signed_at).toISOString().split('T')[0] : (manifestData.signed_at ? new Date(manifestData.signed_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    generator_time: manifestData.generator_signed_at ? new Date(manifestData.generator_signed_at).toLocaleTimeString('en-US', { hour12: false }) : (manifestData.signed_at ? new Date(manifestData.signed_at).toLocaleTimeString('en-US', { hour12: false }) : new Date().toLocaleTimeString('en-US', { hour12: false })),
    generator_signature: manifestData.customer_signature_png_path || '',

    // Hauler information - use actual hauler data from database
    hauler_mi_reg: manifestData.hauler?.hauler_mi_reg || '',
    hauler_other_id: '',
    hauler_name: manifestData.hauler?.hauler_name || '',
    hauler_mail_address: manifestData.hauler?.hauler_mailing_address || '',
    hauler_city: manifestData.hauler?.hauler_city || '',
    hauler_state: manifestData.hauler?.hauler_state || '',
    hauler_zip: manifestData.hauler?.hauler_zip || '',
    hauler_phone: manifestData.hauler?.hauler_phone || '',
    hauler_print_name: createPrintNameWithTimestamp(
      manifestData.signed_by_title, // Use hauler's name from signed_by_title field
      manifestData.hauler_signed_at || manifestData.signed_at,
      'Hauler Representative'
    ),
    hauler_date: manifestData.hauler_signed_at ? new Date(manifestData.hauler_signed_at).toISOString().split('T')[0] : (manifestData.signed_at ? new Date(manifestData.signed_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    hauler_time: manifestData.hauler_signed_at ? new Date(manifestData.hauler_signed_at).toLocaleTimeString('en-US', { hour12: false }) : (manifestData.signed_at ? new Date(manifestData.signed_at).toLocaleTimeString('en-US', { hour12: false }) : new Date().toLocaleTimeString('en-US', { hour12: false })),
    hauler_gross_weight: (manifestData.gross_weight_lbs || manifestData.gross_weight || '').toString(),
    hauler_tare_weight: '0.0',
    hauler_net_weight: (() => {
      const g = Number(manifestData.gross_weight_lbs || manifestData.gross_weight);
      return isNaN(g) ? '' : g.toFixed(1);
    })(),
    hauler_total_pte: (() => {
      // Same total PTE calculation using Michigan conversion constants
      const passengerPTE = ((manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0)) * MICHIGAN_CONVERSIONS.PASSENGER_TIRE_TO_PTE;
      const truckCount = (manifestData.commercial_17_5_19_5_off || 0) + (manifestData.commercial_17_5_19_5_on || 0) +
                         (manifestData.commercial_22_5_off || 0) + (manifestData.commercial_22_5_on || 0);
      const truckPTE = truckCount * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;
      const oversizedCount = (manifestData.otr_count || 0) + (manifestData.tractor_count || 0);
      const oversizedPTE = oversizedCount * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE;
      return (passengerPTE + truckPTE + oversizedPTE).toString();
    })(),
    hauler_signature: manifestData.driver_signature_png_path || '',

    // Receiver information - prefer overrides; leave blank if not provided
    receiver_mi_reg: receiverData?.collection_site_reg || '',
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
      // Same total PTE calculation using Michigan conversion constants
      const passengerPTE = ((manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0)) * MICHIGAN_CONVERSIONS.PASSENGER_TIRE_TO_PTE;
      const truckCount = (manifestData.commercial_17_5_19_5_off || 0) + (manifestData.commercial_17_5_19_5_on || 0) +
                         (manifestData.commercial_22_5_off || 0) + (manifestData.commercial_22_5_on || 0);
      const truckPTE = truckCount * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;
      const oversizedCount = (manifestData.otr_count || 0) + (manifestData.tractor_count || 0);
      const oversizedPTE = oversizedCount * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE;
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
      // 1. Fetch manifest data with all related entities including dropoff data
      const { data: manifestData, error: fetchError } = await supabase
        .from('manifests')
        .select(`
          *,
          client:clients(*),
          location:locations(*),
          hauler:haulers(*),
          pickup:pickups!manifests_pickup_id_fkey(*),
          dropoff:dropoffs(*, dropoff_customer:dropoff_customers(*))
        `)
        .eq('id', manifestId)
        .single();

      if (fetchError) throw fetchError;
      
      if (!manifestData) {
        throw new Error('Manifest not found');
      }

      // Validate fetched data
      console.log('[MANIFEST_INTEGRATION] Validating manifest data...');
      
      // Debug: verify signature paths are present on the manifest record
      console.log('[MANIFEST_INTEGRATION] Signature fields on manifest row:', {
        manifestId,
        customer_signature_png_path: manifestData.customer_signature_png_path,
        driver_signature_png_path: manifestData.driver_signature_png_path,
      });

      // 2. Check if this is a dropoff manifest and extract dropoff customer data
      let dropoffCustomerData = null;
      const isDropoffManifest = manifestData.client?.company_name === "Dropoff Customers" && manifestData.dropoff;
      
      if (isDropoffManifest && manifestData.dropoff?.dropoff_customer) {
        const dc = manifestData.dropoff.dropoff_customer;
        dropoffCustomerData = {
          generator_name: dc.company_name || dc.contact_name || '',
          generator_mail_address: '', // Dropoff customers don't have mailing address in schema
          generator_city: '',
          generator_state: '',
          generator_zip: '',
          generator_physical_address: '',
          generator_physical_city: '',
          generator_physical_state: '',
          generator_physical_zip: '',
          generator_county: '',
          generator_phone: dc.phone || ''
        };
        
        console.log('[MANIFEST_INTEGRATION] Using dropoff customer as generator:', {
          manifestId,
          dropoffCustomerName: dc.company_name || dc.contact_name,
          isDropoffManifest
        });
      }
      
      // 3. Build AcroForm data from DB record
      const acroFormData = convertManifestToAcroForm(manifestData, undefined);
      
      // Override generator fields with dropoff customer data if applicable
      const mergedData = { 
        ...acroFormData, 
        ...(dropoffCustomerData || {}),
        ...(overrides || {}) 
      };
      
      // Validate AcroForm data before mapping
      const validationResult = validateAcroFormData(mergedData as Partial<AcroFormManifestData>);
      logValidationResults('useManifestIntegration', validationResult);
      
      if (!validationResult.isValid) {
        throw new Error(`Manifest validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      // Sanitize data to ensure all fields have valid values
      const sanitizedData = sanitizeAcroFormData(mergedData as Partial<AcroFormManifestData>);

      // Map domain field names to v4 template field names
      const config = getCurrentTemplateConfig();
      const templateFields: Record<string, string> = {};
      
      Object.entries(sanitizedData).forEach(([key, value]) => {
        const templateField = config.fieldMapping[key];
        if (templateField && value !== null && value !== undefined && value !== '') {
          templateFields[templateField] = String(value);
        }
      });

      // Observability
      const populatedFieldCount = Object.keys(templateFields).length;
      console.log('[MANIFEST_INTEGRATION][v4] Field mapping complete', {
        manifestId,
        populatedFieldCount,
        templateVersion: config.version,
        validationErrors: validationResult.errors.length,
        validationWarnings: validationResult.warnings.length,
        sampleFields: {
          hauler_name: sanitizedData.hauler_name,
          hauler_gross_weight: sanitizedData.hauler_gross_weight,
          hauler_tare_weight: sanitizedData.hauler_tare_weight,
          receiver_name: sanitizedData.receiver_name,
          generator_signature: sanitizedData.generator_signature,
          hauler_signature: sanitizedData.hauler_signature,
          mappedGeneratorSignature: templateFields['Generator_Signature _es_:signer:signature'],
          mappedHaulerSignature: templateFields['Hauler_Signature _es_:signer:signature'],
          mappedHaulerName: templateFields['Hauler_Name'],
          mappedHaulerGross: templateFields['Gross'],
          mappedHaulerTare: templateFields['Tare'],
          mappedReceiverName: templateFields['Receiver_Name']
        }
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
        grossWeightRaw: (manifestData as any).gross_weight_lbs || (manifestData as any).gross_weight,
        tareWeightRaw: (manifestData as any).tare_weight_lbs || (manifestData as any).tare_weight,
        netWeightRaw: (manifestData as any).net_weight_lbs || (manifestData as any).net_weight,
        tireCounts: {
          pte_off_rim: manifestData.pte_off_rim,
          pte_on_rim: manifestData.pte_on_rim,
          otr_count: manifestData.otr_count,
          tractor_count: manifestData.tractor_count
        }
      });
      
      // Verify gross weight is being mapped correctly to 'Gross' field
      console.log('[MANIFEST_INTEGRATION] Weight mapping verification:', {
        domainField_hauler_gross_weight: mergedData.hauler_gross_weight,
        templateField_Gross: templateFields['Gross'],
        mappingConfig: config.fieldMapping['hauler_gross_weight']
      });
      
      console.log('[MANIFEST_INTEGRATION] v4 field map stats:', {
        populatedFieldCount,
      });
      
      // Generate precise timestamps for signatures
      const now = new Date();
      const timestamp = now.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      // Generate the PDF using v4 template system with timestamps
      const acroFormResult = await generateAcroForm.mutateAsync({
        // Pass sanitized domain-keyed data; the generator will map to template fields and also pick up meta (times)
        manifestData: sanitizedData as unknown as AcroFormManifestData,
        manifestId: manifestId,
        outputPath: `manifests/integrated-v4-${manifestId}-${Date.now()}.pdf`,
        meta: {
          generator_signature_timestamp: manifestData.generator_signed_at ? timestamp : undefined,
          hauler_signature_timestamp: manifestData.hauler_signed_at ? timestamp : undefined,
          receiver_signature_timestamp: manifestData.receiver_signed_at ? timestamp : undefined,
        }
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
      const raw = error?.message || "Failed to generate manifest PDF.";
      const friendly = /non-?2xx|status code/i.test(raw)
        ? "PDF generation failed: template missing or storage access issue."
        : raw;
      toast({
        title: "Generation Failed",
        description: friendly,
        variant: "destructive"
      });
    }
  });
};