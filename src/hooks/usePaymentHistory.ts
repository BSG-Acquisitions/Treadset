import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentHistoryItem {
  id: string;
  pickup_date: string;
  computed_revenue: number;
  payment_method: string | null;
  payment_status: string | null;
  pte_count: number;
  otr_count: number;
  tractor_count: number;
  location: {
    address: string;
    name: string | null;
  } | null;
  manifest?: {
    pte_on_rim: number;
    pte_off_rim: number;
    otr_count: number;
    tractor_count: number;
    commercial_17_5_19_5_on: number;
    commercial_17_5_19_5_off: number;
    commercial_22_5_on: number;
    commercial_22_5_off: number;
  } | null;
}

export const usePaymentHistory = (clientId: string) => {
  return useQuery({
    queryKey: ['payment-history', clientId],
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pickups')
        .select(`
          id,
          pickup_date,
          computed_revenue,
          payment_method,
          payment_status,
          pte_count,
          otr_count,
          tractor_count,
          location:locations(address, name),
          manifest:manifests!pickups_manifest_id_fkey(
            pte_on_rim,
            pte_off_rim,
            otr_count,
            tractor_count,
            commercial_17_5_19_5_on,
            commercial_17_5_19_5_off,
            commercial_22_5_on,
            commercial_22_5_off
          )
        `)
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('pickup_date', { ascending: false });

      if (error) throw error;
      return (data || []) as PaymentHistoryItem[];
    },
    enabled: !!clientId,
  });
};
