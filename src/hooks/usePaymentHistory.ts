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
}

export const usePaymentHistory = (clientId: string) => {
  return useQuery({
    queryKey: ['payment-history', clientId],
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
          location:locations(address, name)
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
