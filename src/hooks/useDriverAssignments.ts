import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useDriverAssignments = (date?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['driver-assignments', user?.email, date],
    queryFn: async () => {
      if (!user?.email) return [];
      
      // First, get vehicles assigned to this driver's email (case-insensitive)
      const { data: driverVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .ilike('driver_email', user.email);
      
      if (!driverVehicles || driverVehicles.length === 0) return [];
      
      const vehicleIds = driverVehicles.map(v => v.id);
      
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
          vehicle:vehicles(id, name, capacity, license_plate, driver_email),
          hauler:haulers(id, hauler_name, hauler_mi_reg),
          trailer:trailers(id, trailer_number, current_status, current_location)
        `)
        .in('vehicle_id', vehicleIds);
      
      if (date) {
        query = query.eq('scheduled_date', date);
      }
      
      const { data, error } = await query.order('estimated_arrival', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
    enabled: !!user?.email,
  });
};