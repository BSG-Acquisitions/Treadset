import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useManifestIntegration } from "./useManifestIntegration";
import type { Database } from "@/integrations/supabase/types";

type DropoffInsert = Database["public"]["Tables"]["dropoffs"]["Insert"];

interface CreateDropoffWithManifestParams {
  dropoff: DropoffInsert;
  vehicleId?: string;
}

export const useCreateDropoffWithManifest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const manifestIntegration = useManifestIntegration();

  return useMutation({
    mutationFn: async ({ dropoff, vehicleId }: CreateDropoffWithManifestParams) => {
      // 1. Create the dropoff record
      const { data: dropoffData, error: dropoffError } = await supabase
        .from('dropoffs')
        .insert(dropoff)
        .select()
        .single();

      if (dropoffError) throw dropoffError;

      // 2. Generate a manifest number
      const { data: manifestNumber, error: manifestNumberError } = await supabase
        .rpc('generate_manifest_number', { org_id: dropoff.organization_id });

      if (manifestNumberError) throw manifestNumberError;

      // 3. Create a manifest record for this dropoff
      const { data: manifestData, error: manifestError } = await supabase
        .from('manifests')
        .insert({
          manifest_number: manifestNumber,
          client_id: dropoff.client_id,
          hauler_id: dropoff.hauler_id,
          dropoff_id: dropoffData.id,
          vehicle_id: vehicleId || null,
          organization_id: dropoff.organization_id,
          // Map dropoff tire counts to manifest fields
          pte_off_rim: dropoff.pte_count || 0,
          pte_on_rim: 0,
          otr_count: dropoff.otr_count || 0,
          tractor_count: dropoff.tractor_count || 0,
          commercial_17_5_19_5_off: 0,
          commercial_17_5_19_5_on: 0,
          commercial_22_5_off: 0,
          commercial_22_5_on: 0,
          total: dropoff.computed_revenue || 0,
          status: 'COMPLETED',
          signed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (manifestError) throw manifestError;

      // 4. Generate the manifest PDF
      const pdfResult = await manifestIntegration.mutateAsync({
        manifestId: manifestData.id,
      });

      // 5. Update dropoff with manifest_id and manifest_pdf_path
      const { error: updateError } = await supabase
        .from('dropoffs')
        .update({
          manifest_id: manifestData.id,
          manifest_pdf_path: pdfResult.pdfPath,
        })
        .eq('id', dropoffData.id);

      if (updateError) throw updateError;

      // 6. Send email with manifest
      const { data: clientData } = await supabase
        .from('clients')
        .select('email, company_name')
        .eq('id', dropoff.client_id)
        .single();

      if (clientData?.email) {
        await supabase.functions.invoke('send-manifest-email', {
          body: {
            to: clientData.email,
            manifestId: manifestData.id,
            clientName: clientData.company_name,
            manifestNumber: manifestNumber,
            pdfUrl: `https://wvjehbozyxhmgdljwsiz.supabase.co/storage/v1/object/public/${pdfResult.pdfPath}`,
          },
        });
      }

      return { dropoff: dropoffData, manifest: manifestData, pdfPath: pdfResult.pdfPath };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      queryClient.invalidateQueries({ queryKey: ['todays-dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-tire-totals'] });
      queryClient.invalidateQueries({ queryKey: ['yesterday-tire-totals'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-tire-totals'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-stats'] });
      toast({ 
        title: "Success", 
        description: "Drop-off processed and manifest generated successfully" 
      });
    },
    onError: (error: Error) => {
      console.error('Drop-off manifest creation error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to process drop-off", 
        variant: "destructive" 
      });
    }
  });
};
