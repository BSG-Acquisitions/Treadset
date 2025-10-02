import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HaulerRate {
  id: string;
  organization_id: string;
  hauler_id: string;
  pte_rate: number;
  otr_rate: number;
  tractor_rate: number;
  effective_from: string;
  effective_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Get rates for a hauler at a facility
export const useHaulerRates = (organizationId?: string, haulerId?: string) => {
  return useQuery({
    queryKey: ["hauler-rates", organizationId, haulerId],
    queryFn: async () => {
      let query = supabase
        .from("facility_hauler_rates" as any)
        .select("*")
        .order("effective_from", { ascending: false });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }
      if (haulerId) {
        query = query.eq("hauler_id", haulerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any as HaulerRate[];
    },
    enabled: !!(organizationId || haulerId),
  });
};

// Get current active rate for a hauler
export const useCurrentHaulerRate = (organizationId: string, haulerId: string) => {
  return useQuery({
    queryKey: ["current-hauler-rate", organizationId, haulerId],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("facility_hauler_rates" as any)
        .select("*")
        .eq("organization_id", organizationId)
        .eq("hauler_id", haulerId)
        .lte("effective_from", now)
        .or(`effective_to.is.null,effective_to.gte.${now}`)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as any as HaulerRate | null;
    },
    enabled: !!(organizationId && haulerId),
  });
};

// Set rates for a hauler
export const useSetHaulerRates = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organization_id,
      hauler_id,
      pte_rate,
      otr_rate,
      tractor_rate,
      notes,
    }: {
      organization_id: string;
      hauler_id: string;
      pte_rate: number;
      otr_rate: number;
      tractor_rate: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("facility_hauler_rates" as any)
        .insert({
          organization_id,
          hauler_id,
          pte_rate,
          otr_rate,
          tractor_rate,
          notes,
          effective_from: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hauler-rates"] });
      queryClient.invalidateQueries({ queryKey: ["current-hauler-rate"] });
      toast.success("Hauler rates set successfully");
    },
    onError: (error) => {
      console.error("Error setting hauler rates:", error);
      toast.error("Failed to set hauler rates");
    },
  });
};

// Update rates
export const useUpdateHaulerRates = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<HaulerRate> 
    }) => {
      const { data: rate, error } = await supabase
        .from("facility_hauler_rates" as any)
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return rate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hauler-rates"] });
      queryClient.invalidateQueries({ queryKey: ["current-hauler-rate"] });
      toast.success("Rates updated successfully");
    },
    onError: (error) => {
      console.error("Error updating rates:", error);
      toast.error("Failed to update rates");
    },
  });
};
