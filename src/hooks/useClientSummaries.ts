import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClientSummary {
  id: string;
  client_id: string;
  year: number;
  month: number | null;
  total_pickups: number;
  total_ptes: number;
  total_otr: number;
  total_tractor: number;
  total_revenue: number;
  total_weight_tons: number;
  total_volume_yards: number;
  first_pickup_date: string | null;
  last_pickup_date: string | null;
  average_pickup_size: number | null;
  pickup_frequency_days: number | null;
  notes: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  client?: {
    company_name: string;
  };
}

interface ClientSummaryParams {
  year?: number;
  clientId?: string;
  month?: number;
}

export const useClientSummaries = (params: ClientSummaryParams = {}) => {
  const { year = 2025, clientId, month } = params;

  return useQuery({
    queryKey: ['client-summaries', year, clientId, month],
    queryFn: async () => {
      let query = supabase
        .from('client_summaries')
        .select(`
          *,
          client:client_id(company_name)
        `)
        .eq('year', year)
        .order('total_revenue', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (month !== undefined) {
        query = query.eq('month', month);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching client summaries:', error);
        throw error;
      }

      return data as ClientSummary[];
    }
  });
};

export const useClientSummaryAnalytics = (year: number = 2025) => {
  return useQuery({
    queryKey: ['client-summary-analytics', year],
    queryFn: async () => {
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data, error } = await supabase
        .from('client_summaries')
        .select('client_id, total_pickups, total_revenue, total_ptes, total_weight_tons, month, client:client_id(company_name)')
        .eq('year', year)
        .eq('organization_id', 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73');

      if (error) {
        console.error('Error fetching analytics:', error);
        throw error;
      }

      // Calculate analytics
      const totalClients = new Set(data.map(s => s.client_id)).size;
      const totalPickups = data.reduce((sum, s) => sum + s.total_pickups, 0);
      const totalRevenue = data.reduce((sum, s) => sum + s.total_revenue, 0);
      const totalPtes = data.reduce((sum, s) => sum + s.total_ptes, 0);
      const totalTons = data.reduce((sum, s) => sum + s.total_weight_tons, 0);

      console.log('Analytics calculations:', {
        dataLength: data.length,
        totalClients,
        totalPickups,
        totalRevenue,
        totalPtes,
        firstFewClients: Array.from(new Set(data.map(s => s.client_id))).slice(0, 5),
        sampleRecords: data.slice(0, 3).map(d => ({
          client_id: d.client_id,
          month: d.month,
          revenue: d.total_revenue,
          pickups: d.total_pickups
        }))
      });

      // Monthly breakdown
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthData = data.filter(s => s.month === month);
        return {
          month,
          pickups: monthData.reduce((sum, s) => sum + s.total_pickups, 0),
          revenue: monthData.reduce((sum, s) => sum + s.total_revenue, 0),
          ptes: monthData.reduce((sum, s) => sum + s.total_ptes, 0)
        };
      });

      // Top clients
      const clientTotals = new Map();
      data.forEach(summary => {
        const clientId = summary.client_id;
        if (!clientTotals.has(clientId)) {
          clientTotals.set(clientId, {
            client_id: clientId,
            company_name: (summary as any).client?.company_name || `Client ${clientId.slice(0, 8)}`,
            total_revenue: 0,
            total_pickups: 0,
            total_ptes: 0
          });
        }
        const client = clientTotals.get(clientId);
        client.total_revenue += summary.total_revenue;
        client.total_pickups += summary.total_pickups;
        client.total_ptes += summary.total_ptes;
      });

      const topClients = Array.from(clientTotals.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10);

      return {
        totals: {
          totalClients,
          totalPickups,
          totalRevenue,
          totalPtes,
          totalTons,
          averagePickupSize: totalPtes / totalPickups || 0,
          averageRevenuePerClient: totalRevenue / totalClients || 0
        },
        monthlyData,
        topClients
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - longer cache to reduce requests
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    retry: 1, // Reduce retry attempts
  });
};