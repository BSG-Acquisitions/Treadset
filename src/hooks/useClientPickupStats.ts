import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientPickupStats {
  avgTires: number;
  avgPrice: number;
  pickupCount: number;
}

export function useClientPickupStats(clientIds: string[]) {
  return useQuery({
    queryKey: ["client-pickup-stats", clientIds],
    queryFn: async () => {
      if (!clientIds.length) return {};

      // Query manifests to get tire counts and price per client
      const { data, error } = await supabase
        .from("manifests")
        .select("client_id, pte_off_rim, pte_on_rim, commercial_17_5_19_5_off, commercial_17_5_19_5_on, commercial_22_5_off, commercial_22_5_on, otr_count, tractor_count, total")
        .in("client_id", clientIds)
        .or("status.eq.COMPLETED,signed_at.not.is.null");

      if (error) throw error;

      // Aggregate stats by client
      const statsMap: Record<string, { totalTires: number; totalPrice: number; count: number }> = {};

      for (const manifest of data || []) {
        const clientId = manifest.client_id;
        if (!clientId) continue;

        if (!statsMap[clientId]) {
          statsMap[clientId] = { totalTires: 0, totalPrice: 0, count: 0 };
        }

        // Sum all tire types
        const tireCount = 
          (manifest.pte_off_rim || 0) +
          (manifest.pte_on_rim || 0) +
          (manifest.commercial_17_5_19_5_off || 0) +
          (manifest.commercial_17_5_19_5_on || 0) +
          (manifest.commercial_22_5_off || 0) +
          (manifest.commercial_22_5_on || 0) +
          (manifest.otr_count || 0) +
          (manifest.tractor_count || 0);

        statsMap[clientId].totalTires += tireCount;
        statsMap[clientId].totalPrice += manifest.total || 0;
        statsMap[clientId].count += 1;
      }

      // Convert to averages
      const result: Record<string, ClientPickupStats> = {};
      for (const [clientId, stats] of Object.entries(statsMap)) {
        result[clientId] = {
          avgTires: stats.count > 0 ? Math.round(stats.totalTires / stats.count) : 0,
          avgPrice: stats.count > 0 ? Math.round((stats.totalPrice / stats.count) * 100) / 100 : 0,
          pickupCount: stats.count,
        };
      }

      return result;
    },
    enabled: clientIds.length > 0,
  });
}
