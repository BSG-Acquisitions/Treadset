import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentHistoryItem {
  id: string;
  transaction_date: string;
  transaction_type: 'pickup' | 'dropoff';
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
  // Dropoff-specific pricing
  unit_price_pte?: number | null;
  unit_price_otr?: number | null;
  unit_price_tractor?: number | null;
}

export const usePaymentHistory = (clientId: string) => {
  return useQuery({
    queryKey: ['payment-history', clientId],
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      // Fetch pickups
      const { data: pickups, error: pickupsError } = await supabase
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

      if (pickupsError) throw pickupsError;

      // Fetch dropoffs
      const { data: dropoffs, error: dropoffsError } = await supabase
        .from('dropoffs')
        .select(`
          id,
          dropoff_date,
          computed_revenue,
          payment_method,
          payment_status,
          pte_count,
          otr_count,
          tractor_count,
          unit_price_pte,
          unit_price_otr,
          unit_price_tractor
        `)
        .eq('client_id', clientId)
        .order('dropoff_date', { ascending: false });

      if (dropoffsError) throw dropoffsError;

      // Normalize pickups
      const normalizedPickups: PaymentHistoryItem[] = (pickups || []).map(p => ({
        id: p.id,
        transaction_date: p.pickup_date,
        transaction_type: 'pickup' as const,
        computed_revenue: p.computed_revenue || 0,
        payment_method: p.payment_method,
        payment_status: p.payment_status,
        pte_count: p.pte_count || 0,
        otr_count: p.otr_count || 0,
        tractor_count: p.tractor_count || 0,
        location: p.location,
        manifest: p.manifest
      }));

      // Normalize dropoffs
      const normalizedDropoffs: PaymentHistoryItem[] = (dropoffs || []).map(d => ({
        id: d.id,
        transaction_date: d.dropoff_date,
        transaction_type: 'dropoff' as const,
        computed_revenue: d.computed_revenue || 0,
        payment_method: d.payment_method,
        payment_status: d.payment_status,
        pte_count: d.pte_count || 0,
        otr_count: d.otr_count || 0,
        tractor_count: d.tractor_count || 0,
        location: null,
        manifest: null,
        unit_price_pte: d.unit_price_pte,
        unit_price_otr: d.unit_price_otr,
        unit_price_tractor: d.unit_price_tractor
      }));

      // Combine and sort by date descending
      const combined = [...normalizedPickups, ...normalizedDropoffs].sort(
        (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );

      return combined;
    },
    enabled: !!clientId,
  });
};
