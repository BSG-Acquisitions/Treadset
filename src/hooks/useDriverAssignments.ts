import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useDriverAssignments = (date?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['driver-assignments', user?.id, date],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('assignments')
        .select(`
          *,
          pickup:pickups(*,
            client:clients(
              id, 
              company_name, 
              contact_name,
              email, 
              phone,
              mailing_address, 
              city, 
              state, 
              zip, 
              county,
              physical_address,
              physical_city,
              physical_state,
              physical_zip
            ),
            location:locations(id, address, name, latitude, longitude)
          ),
          vehicle:vehicles(id, name, capacity, license_plate),
          hauler:haulers(id, hauler_name, hauler_mi_reg)
        `)
        .eq('driver_id', user.id);
      
      if (date) {
        query = query.eq('scheduled_date', date);
      }
      
      const { data, error } = await query.order('estimated_arrival', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
    enabled: !!user?.id,
  });
};