import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DriverPerformanceMetrics {
  id: string;
  driver_id: string;
  organization_id: string;
  avg_stops_per_day: number;
  on_time_rate: number;
  avg_pickup_duration_minutes: number;
  avg_mileage_per_stop: number;
  total_assignments: number;
  completed_assignments: number;
  on_time_arrivals: number;
  total_miles_driven: number;
  daily_stops_trend: Array<{ date: string; value: number }>;
  on_time_trend: Array<{ date: string; value: number }>;
  calculation_period_start: string;
  calculation_period_end: string;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
  driver?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const useDriverPerformance = () => {
  return useQuery({
    queryKey: ['driver-performance-beta'],
    queryFn: async () => {
      // Get the most recent calculation period for each driver
      const { data, error } = await supabase
        .from('driver_performance')
        .select(`
          *,
          driver:users!driver_id(
            first_name,
            last_name,
            email
          )
        `)
        .order('last_calculated_at', { ascending: false });

      if (error) throw error;

      // Filter to only the most recent record per driver
      const uniqueDrivers = new Map<string, any>();
      (data || []).forEach(record => {
        if (!uniqueDrivers.has(record.driver_id)) {
          uniqueDrivers.set(record.driver_id, record);
        }
      });

      return Array.from(uniqueDrivers.values()) as DriverPerformanceMetrics[];
    },
  });
};

export const useCalculateDriverPerformance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-driver-performance', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver-performance-beta'] });
      toast.success('Driver performance calculated', {
        description: `Processed ${data.recordsProcessed} driver${data.recordsProcessed !== 1 ? 's' : ''}`,
      });
    },
    onError: (error: Error) => {
      console.error('Error calculating driver performance:', error);
      toast.error('Failed to calculate performance', {
        description: error.message,
      });
    },
  });
};