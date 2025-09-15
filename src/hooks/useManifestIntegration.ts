import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGenerateAcroFormManifest, convertToAcroFormFields } from "@/hooks/useAcroFormManifest";
import { AcroFormManifestData } from "@/types/acroform-manifest";

export interface ManifestIntegrationParams {
  manifestId: string;
}

// Convert manifest database data to AcroForm structure
const convertManifestToAcroForm = (manifestData: any): Partial<AcroFormManifestData> => {
  return {
    manifest_number: manifestData.manifest_number || `M-${Date.now()}`,
    vehicle_trailer: `V-${manifestData.vehicle_id || '123'}`,
    
    // Generator (Client) information
    generator_name: manifestData.client?.[0]?.company_name || 'Generator',
    generator_mail_address: '2971 Bellevue Street',
    generator_city: 'Detroit',
    generator_state: 'MI',
    generator_zip: '48207',
    generator_physical_address: '2971 Bellevue Street',
    generator_physical_city: 'Detroit',
    generator_physical_state: 'MI',
    generator_physical_zip: '48207',
    generator_county: 'Wayne',
    generator_phone: manifestData.client?.[0]?.phone || '(734) 415-6528',
    generator_volume_weight: ((manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0)).toString(),
    generator_date_processed: new Date().toISOString().split('T')[0],
    generator_print_name: manifestData.client?.[0]?.contact_name || 'Generator Rep',
    generator_date: new Date().toISOString().split('T')[0],

    // Hauler information (BSG Logistics)
    hauler_mi_reg: 'H-12345',
    hauler_other_id: '',
    hauler_name: 'BSG Logistics',
    hauler_mail_address: '2971 Bellevue Street',
    hauler_city: 'Detroit',
    hauler_state: 'MI',
    hauler_zip: '48207',
    hauler_phone: '(734) 415-6528',
    hauler_print_name: 'BSG Driver',
    hauler_date: new Date().toISOString().split('T')[0],
    hauler_gross_weight: '',
    hauler_tare_weight: '',
    hauler_net_weight: '',
    hauler_total_pte: ((manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0)).toString(),

    // Receiver information (Processing facility)
    receiver_mi_reg: 'R-67890',
    receiver_name: 'BSG Tire Recycling Center',
    receiver_physical_address: '2971 Bellevue Street',
    receiver_city: 'Detroit',
    receiver_state: 'MI',
    receiver_zip: '48207',
    receiver_phone: '(734) 415-6528',
    receiver_print_name: 'BSG Processor',
    receiver_date: new Date().toISOString().split('T')[0],
    receiver_gross_weight: '',
    receiver_total_pte: ((manifestData.pte_off_rim || 0) + (manifestData.pte_on_rim || 0)).toString(),
    receiver_tare_weight: '',
    receiver_net_weight: ''
  };
};

export const useManifestIntegration = () => {
  const { toast } = useToast();
  const generateAcroForm = useGenerateAcroFormManifest();

  return useMutation({
    mutationFn: async ({ manifestId }: ManifestIntegrationParams) => {
      // 1. Fetch manifest data from database
      const { data: manifestData, error: fetchError } = await supabase
        .from('manifests')
        .select(`
          *,
          client:clients(company_name, contact_name, phone)
        `)
        .eq('id', manifestId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Generate AcroForm PDF
      const acroFormData = convertManifestToAcroForm(manifestData);
      const acroFormFields = convertToAcroFormFields(acroFormData);
      
      const acroFormResult = await generateAcroForm.mutateAsync({
        templatePath: 'Michigan_Manifest_AcroForm.pdf',
        manifestData: acroFormFields,
        manifestId: manifestId,
        outputPath: `manifests/acroform-${manifestId}-${Date.now()}.pdf`
      });

      // 3. Update manifest with AcroForm PDF path
      const { error: updateError } = await supabase
        .from('manifests')
        .update({
          acroform_pdf_path: acroFormResult.pdfPath,
          status: 'COMPLETED',
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