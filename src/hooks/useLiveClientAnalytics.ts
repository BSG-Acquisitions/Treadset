import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MonthlyData {
  month: number;
  pickups: number;
  revenue: number;
  ptes: number;
}

interface TopClient {
  client_id: string;
  company_name: string;
  revenue: number;
  pickups: number;
  ptes: number;
}

interface LiveAnalytics {
  total_clients: number;
  total_pickups: number;
  total_revenue: number;
  total_ptes: number;
  total_otr: number;
  total_tractor: number;
  total_weight_tons: number;
  monthly_data: MonthlyData[];
  top_clients: TopClient[];
}

export const useLiveClientAnalytics = (year: number = new Date().getFullYear()) => {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['live-client-analytics', organizationId, year],
    queryFn: async (): Promise<LiveAnalytics> => {
      if (!organizationId) {
        throw new Error('No organization found');
      }

      const { data, error } = await supabase.rpc('get_live_client_analytics', {
        p_organization_id: organizationId,
        p_year: year
      });

      if (error) {
        console.error('Error fetching live analytics:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          total_clients: 0,
          total_pickups: 0,
          total_revenue: 0,
          total_ptes: 0,
          total_otr: 0,
          total_tractor: 0,
          total_weight_tons: 0,
          monthly_data: [],
          top_clients: []
        };
      }

      const result = data[0];
      
      return {
        total_clients: Number(result.total_clients || 0),
        total_pickups: Number(result.total_pickups || 0),
        total_revenue: Number(result.total_revenue || 0),
        total_ptes: Number(result.total_ptes || 0),
        total_otr: Number(result.total_otr || 0),
        total_tractor: Number(result.total_tractor || 0),
        total_weight_tons: Number(result.total_weight_tons || 0),
        monthly_data: (result.monthly_data as unknown as MonthlyData[]) || [],
        top_clients: (result.top_clients as unknown as TopClient[]) || []
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};
