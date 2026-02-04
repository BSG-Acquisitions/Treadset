import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { pteToTons, convertToTons } from "@/lib/michigan-conversions";
import type { Database } from "@/integrations/supabase/types";

type Shipment = Database['public']['Tables']['shipments']['Row'];
type ShipmentInsert = Database['public']['Tables']['shipments']['Insert'];
type ShipmentUpdate = Database['public']['Tables']['shipments']['Update'];
type Entity = Database['public']['Tables']['entities']['Row'];
type MaterialForm = Database['public']['Enums']['material_form'];
type EndUse = Database['public']['Enums']['end_use'];
type UnitBasis = Database['public']['Enums']['unit_basis'];
type Direction = Database['public']['Enums']['direction'];

export interface ShipmentWithRelations extends Shipment {
  origin_entity?: Entity | null;
  destination_entity?: Entity | null;
  tons?: number;
}

export interface ShipmentFormData {
  departed_at: string;
  arrived_at?: string | null;
  destination_entity_id: string;
  origin_entity_id: string;
  material_form: MaterialForm;
  quantity: number;
  quantity_pte: number;
  unit_basis: UnitBasis;
  direction: Direction;
  end_use?: EndUse | null;
  carrier?: string | null;
  bol_number?: string | null;
  notes?: string | null;
  manifest_id?: string | null;
}

// Fetch all outbound shipments with related entities
export const useShipments = (options?: { 
  direction?: Direction;
  year?: number;
  destinationEntityId?: string;
  materialForm?: MaterialForm;
}) => {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  
  return useQuery({
    queryKey: ['shipments', options, organizationId],
    queryFn: async (): Promise<ShipmentWithRelations[]> => {
      if (!organizationId) {
        throw new Error('No organization context');
      }

      let query = supabase
        .from('shipments')
        .select(`
          *,
          origin_entity:entities!shipments_origin_entity_id_fkey(*),
          destination_entity:entities!shipments_destination_entity_id_fkey(*)
        `)
        .eq('organization_id', organizationId)
        .order('departed_at', { ascending: false });

      // Apply filters
      if (options?.direction) {
        query = query.eq('direction', options.direction);
      }

      if (options?.year) {
        query = query
          .gte('departed_at', `${options.year}-01-01`)
          .lte('departed_at', `${options.year}-12-31`);
      }

      if (options?.destinationEntityId) {
        query = query.eq('destination_entity_id', options.destinationEntityId);
      }

      if (options?.materialForm) {
        query = query.eq('material_form', options.materialForm);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching shipments:', error);
        throw error;
      }

      // Calculate tons for each shipment
      return (data || []).map(shipment => ({
        ...shipment,
        tons: calculateShipmentTons(shipment)
      }));
    },
    enabled: !!organizationId
  });
};

// Calculate tonnage from shipment data
function calculateShipmentTons(shipment: Shipment): number {
  const unitBasis = shipment.unit_basis;
  const quantity = shipment.quantity;
  
  // Use the universal conversion function
  return convertToTons(quantity, unitBasis as any, shipment.material_form);
}

// Create a new shipment
export const useCreateShipment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ShipmentFormData) => {
      const organizationId = user?.currentOrganization?.id;
      if (!organizationId) {
        throw new Error('No organization context');
      }

      const insertData: ShipmentInsert = {
        ...data,
        organization_id: organizationId
      };

      const { data: shipment, error } = await supabase
        .from('shipments')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating shipment:', error);
        throw error;
      }

      return shipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-summary'] });
      toast({
        title: "Shipment Recorded",
        description: "Outbound shipment has been saved successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

// Update an existing shipment
export const useUpdateShipment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ShipmentUpdate }) => {
      const { data: shipment, error } = await supabase
        .from('shipments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating shipment:', error);
        throw error;
      }

      return shipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-summary'] });
      toast({
        title: "Shipment Updated",
        description: "Shipment has been updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

// Delete a shipment
export const useDeleteShipment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting shipment:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-summary'] });
      toast({
        title: "Shipment Deleted",
        description: "Shipment has been removed"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

// Get outbound summary by year (for reporting)
export const useOutboundSummary = (year: number) => {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  
  return useQuery({
    queryKey: ['outbound-summary', year, organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('No organization context');
      }

      const { data: shipments, error } = await supabase
        .from('shipments')
        .select(`
          *,
          destination_entity:entities!shipments_destination_entity_id_fkey(*)
        `)
        .eq('organization_id', organizationId)
        .eq('direction', 'outbound')
        .gte('departed_at', `${year}-01-01`)
        .lte('departed_at', `${year}-12-31`);

      if (error) {
        console.error('Error fetching outbound summary:', error);
        throw error;
      }

      // Calculate totals
      let totalPTE = 0;
      let totalTons = 0;
      const byDestination: Record<string, { name: string; pte: number; tons: number; shipments: number }> = {};
      const byMaterialForm: Record<string, { pte: number; tons: number }> = {};
      const byEndUse: Record<string, { pte: number; tons: number }> = {};
      const monthlyData: Record<number, { pte: number; tons: number; shipments: number }> = {};

      (shipments || []).forEach(shipment => {
        const pte = shipment.quantity_pte || 0;
        const tons = calculateShipmentTons(shipment);

        totalPTE += pte;
        totalTons += tons;

        // By destination
        const destId = shipment.destination_entity_id;
        const destName = (shipment as any).destination_entity?.legal_name || 'Unknown';
        if (!byDestination[destId]) {
          byDestination[destId] = { name: destName, pte: 0, tons: 0, shipments: 0 };
        }
        byDestination[destId].pte += pte;
        byDestination[destId].tons += tons;
        byDestination[destId].shipments += 1;

        // By material form
        const form = shipment.material_form;
        if (!byMaterialForm[form]) {
          byMaterialForm[form] = { pte: 0, tons: 0 };
        }
        byMaterialForm[form].pte += pte;
        byMaterialForm[form].tons += tons;

        // By end use
        const endUse = shipment.end_use || 'other';
        if (!byEndUse[endUse]) {
          byEndUse[endUse] = { pte: 0, tons: 0 };
        }
        byEndUse[endUse].pte += pte;
        byEndUse[endUse].tons += tons;

        // Monthly breakdown
        const month = new Date(shipment.departed_at).getMonth() + 1;
        if (!monthlyData[month]) {
          monthlyData[month] = { pte: 0, tons: 0, shipments: 0 };
        }
        monthlyData[month].pte += pte;
        monthlyData[month].tons += tons;
        monthlyData[month].shipments += 1;
      });

      return {
        year,
        totalPTE: Math.round(totalPTE),
        totalTons: Math.round(totalTons * 100) / 100,
        totalShipments: shipments?.length || 0,
        byDestination,
        byMaterialForm,
        byEndUse,
        monthlyData
      };
    },
    enabled: !!organizationId && !!year
  });
};
