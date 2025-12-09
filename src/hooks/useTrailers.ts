import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TrailerStatus = 'empty' | 'full' | 'staged' | 'in_transit' | 'waiting_unload';

export interface Trailer {
  id: string;
  organization_id: string;
  trailer_number: string;
  current_location: string | null;
  current_location_id: string | null;
  current_status: TrailerStatus;
  last_event_id: string | null;
  notes: string | null;
  is_active: boolean;
  ownership_type: 'owned' | 'rented' | null;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
}

export const useTrailers = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['trailers', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from('trailers')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('trailer_number');
      
      if (error) throw error;
      return data as Trailer[];
    },
    enabled: !!orgId,
  });
};

export const useCreateTrailer = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async (data: { 
      trailer_number: string; 
      notes?: string;
      ownership_type?: string;
      owner_name?: string;
    }) => {
      if (!orgId) throw new Error('No organization selected');
      
      const { data: trailer, error } = await supabase
        .from('trailers')
        .insert({
          organization_id: orgId,
          trailer_number: data.trailer_number,
          notes: data.notes || null,
          ownership_type: data.ownership_type || null,
          owner_name: data.owner_name || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return trailer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailers'] });
      queryClient.invalidateQueries({ queryKey: ['trailer-inventory'] });
      toast.success('Trailer added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add trailer: ${error.message}`);
    },
  });
};

export const useUpdateTrailer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Trailer> & { id: string }) => {
      const { error } = await supabase
        .from('trailers')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailers'] });
      queryClient.invalidateQueries({ queryKey: ['trailer-inventory'] });
      toast.success('Trailer updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update trailer: ${error.message}`);
    },
  });
};

export const useDeleteTrailer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trailers')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailers'] });
      queryClient.invalidateQueries({ queryKey: ['trailer-inventory'] });
      toast.success('Trailer removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove trailer: ${error.message}`);
    },
  });
};
