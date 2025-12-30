import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicStats {
  weekly_tires: number;
  weekly_pte: number;
  monthly_tires: number;
  monthly_pte: number;
  today_tires: number;
  ytd_tires: number;
  ytd_pte: number;
  active_clients: number;
  co2_saved_lbs: number;
  co2_saved_tons: number;
  landfill_diverted_lbs: number;
  landfill_diverted_tons: number;
  years_in_business: number;
  service_regions: {
    name: string;
    days: string[];
  }[];
  // Metadata
  source?: string;
  generated_at?: string;
  cache_hit?: boolean;
  data_unavailable?: boolean;
}

export const usePublicStats = () => {
  return useQuery({
    queryKey: ['public-stats', 'v2'],
    queryFn: async (): Promise<PublicStats> => {
      const { data, error } = await supabase.functions.invoke('public-stats');
      
      if (error) {
        console.error('Error fetching public stats:', error);
        throw error;
      }
      
      return data as PublicStats;
    },
    staleTime: 1000 * 15, // 15 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 30, // Refetch every 30 seconds for live feel
  });
};
