import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicStats {
  weekly_tires: number;
  weekly_pte: number;
  monthly_tires: number;
  monthly_pte: number;
  ytd_tires: number;
  ytd_pte: number;
  active_clients: number;
  co2_saved_lbs: number;
  landfill_diverted_lbs: number;
  years_in_business: number;
  service_regions: {
    name: string;
    days: string[];
  }[];
}

export const usePublicStats = () => {
  return useQuery({
    queryKey: ['public-stats'],
    queryFn: async (): Promise<PublicStats> => {
      const { data, error } = await supabase.functions.invoke('public-stats');
      
      if (error) {
        console.error('Error fetching public stats:', error);
        throw error;
      }
      
      return data as PublicStats;
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60, // Refetch every minute for live feel
  });
};
