import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TrailerVehicle {
  id: string;
  organization_id: string;
  vehicle_number: string;
  vehicle_type: string;
  license_plate: string | null;
  vin: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useTrailerVehicles = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['trailer-vehicles', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from('trailer_vehicles')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('vehicle_number');
      
      if (error) throw error;
      return data as TrailerVehicle[];
    },
    enabled: !!orgId,
  });
};

export const useCreateTrailerVehicle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async (data: {
      vehicle_number: string;
      vehicle_type?: string;
      license_plate?: string;
      vin?: string;
      notes?: string;
    }) => {
      if (!orgId) throw new Error('No organization selected');
      
      const { data: vehicle, error } = await supabase
        .from('trailer_vehicles')
        .insert({
          organization_id: orgId,
          ...data,
        })
        .select()
        .single();
      
      if (error) throw error;
      return vehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailer-vehicles'] });
      toast.success('Vehicle added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add vehicle: ${error.message}`);
    },
  });
};

export const useDeleteTrailerVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trailer_vehicles')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailer-vehicles'] });
      toast.success('Vehicle removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove vehicle: ${error.message}`);
    },
  });
};
