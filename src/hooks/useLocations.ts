import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];
type LocationInsert = Database["public"]["Tables"]["locations"]["Insert"];
type LocationUpdate = Database["public"]["Tables"]["locations"]["Update"];

export const useLocations = (clientId?: string) => {
  return useQuery({
    queryKey: ['locations', clientId],
    queryFn: async () => {
      let query = supabase.from('locations').select('*, pricing_tier:pricing_tier_id(name, rate)');
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId
  });
};

export const useAllLocations = () => {
  return useQuery({
    queryKey: ['all-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*, clients(company_name), pricing_tier:pricing_tier_id(name, rate)')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
};

export const useCreateLocation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (location: LocationInsert) => {
      const { data, error } = await supabase
        .from('locations')
        .insert(location)
        .select()
        .single();

      if (error) throw error;

      // Auto-geocode the new location if it has an address but no coordinates
      if (data && data.address && (!data.latitude || !data.longitude)) {
        try {
          console.log('Auto-geocoding new location:', data.id);
          const { error: geocodeError } = await supabase.functions.invoke('geocode-locations', {
            body: { locationId: data.id }
          });
          
          if (geocodeError) {
            console.warn('Auto-geocode failed:', geocodeError);
          } else {
            // Fetch the updated location with coordinates
            const { data: updatedLocation } = await supabase
              .from('locations')
              .select()
              .eq('id', data.id)
              .single();
            
            if (updatedLocation) {
              // Also backfill the client's geographic data if location was geocoded
              if (updatedLocation.latitude && updatedLocation.longitude && updatedLocation.client_id) {
                console.log('Auto-backfilling client geography for:', updatedLocation.client_id);
                await supabase.functions.invoke('backfill-client-geography', {
                  body: { clientId: updatedLocation.client_id }
                });
              }
              return updatedLocation;
            }
          }
        } catch (err) {
          console.warn('Auto-geocode error:', err);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['data-quality-stats'] });
      toast({ title: "Success", description: "Location created and geocoded" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: LocationUpdate }) => {
      const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all location-related queries
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['clients-table'] });
      
      toast({ title: "Success", description: "Location updated successfully. All related data has been refreshed." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};