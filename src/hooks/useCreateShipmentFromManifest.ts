import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type MaterialForm = Database['public']['Enums']['material_form'];

interface CreateShipmentFromManifestParams {
  manifestId: string;
  originEntityId: string;
  destinationEntityId: string;
  materialForm: MaterialForm;
  quantityPte: number;
  departedAt: string;
  arrivedAt: string;
}

export const useCreateShipmentFromManifest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateShipmentFromManifestParams) => {
      const organizationId = user?.currentOrganization?.id;
      if (!organizationId) {
        throw new Error('No organization context');
      }

      // Check if shipment already exists for this manifest
      const { data: existing } = await supabase
        .from('shipments')
        .select('id')
        .eq('manifest_id', params.manifestId)
        .single();

      if (existing) {
        console.log('Shipment already exists for manifest:', params.manifestId);
        return existing;
      }

      // Calculate tons from PTE (approximate conversion: 1 ton ≈ 89 PTE)
      const tons = Math.round((params.quantityPte / 89) * 100) / 100;

      const { data, error } = await supabase
        .from('shipments')
        .insert({
          organization_id: organizationId,
          manifest_id: params.manifestId,
          origin_entity_id: params.originEntityId,
          destination_entity_id: params.destinationEntityId,
          material_form: params.materialForm,
          quantity: tons,
          quantity_pte: params.quantityPte,
          unit_basis: 'tons',
          direction: 'outbound',
          departed_at: params.departedAt,
          arrived_at: params.arrivedAt,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating shipment from manifest:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-summary'] });
    },
    onError: (error) => {
      console.error('Failed to create shipment from manifest:', error);
      // Don't show toast here - let the caller handle it
    }
  });
};
