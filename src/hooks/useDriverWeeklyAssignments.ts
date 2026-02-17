import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, endOfWeek, format, addDays } from "date-fns";

export const useDriverWeeklyAssignments = (weekStartDate: Date) => {
  const { user } = useAuth();
  
  // Calculate week boundaries (Monday to Sunday)
  const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
  
  const startDateStr = format(weekStart, 'yyyy-MM-dd');
  const endDateStr = format(weekEnd, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['driver-weekly-assignments', user?.email, startDateStr],
    queryFn: async () => {
      if (!user?.email) return { assignments: [], weekDays: [] };
      
      // First, get vehicles assigned to this driver's email (case-insensitive)
      const { data: driverVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .ilike('driver_email', user.email);
      
      if (!driverVehicles || driverVehicles.length === 0) {
        return { 
          assignments: [], 
          weekDays: generateWeekDays(weekStart) 
        };
      }
      
      const vehicleIds = driverVehicles.map(v => v.id);
      
      const { data, error } = await supabase
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
        .in('vehicle_id', vehicleIds)
        .gte('scheduled_date', startDateStr)
        .lte('scheduled_date', endDateStr)
        .order('scheduled_date', { ascending: true })
        .order('estimated_arrival', { ascending: true });
      
      if (error) throw error;
      
      return { 
        assignments: data || [], 
        weekDays: generateWeekDays(weekStart) 
      };
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!user?.email,
  });
};

function generateWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return {
      date: format(day, 'yyyy-MM-dd'),
      dayName: format(day, 'EEE'),
      dayNumber: format(day, 'd'),
      isToday: format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
    };
  });
}
