import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { 
  PriceMatrixRow, 
  SurchargeRule, 
  ClientPricingOverride, 
  LocationPricingOverride,
  TireCategory,
  ServiceMode,
  RimStatus,
  PriceSource
} from "@/lib/pricing/types";

// Price Matrix hooks
export const usePriceMatrix = (organizationId: string) => {
  return useQuery({
    queryKey: ['price-matrix', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_matrix')
        .select('*')
        .eq('organization_id', organizationId)
        .order('tire_category')
        .order('service_mode')
        .order('priority');

      if (error) throw error;
      return data as PriceMatrixRow[];
    },
    enabled: !!organizationId
  });
};

export const useCreatePriceMatrix = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<PriceMatrixRow, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('price_matrix')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-matrix'] });
      toast({ title: "Success", description: "Price matrix entry created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

export const useUpdatePriceMatrix = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PriceMatrixRow> }) => {
      const { data, error } = await supabase
        .from('price_matrix')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-matrix'] });
      toast({ title: "Success", description: "Price matrix entry updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

// Surcharge Rules hooks
export const useSurchargeRules = (organizationId: string) => {
  return useQuery({
    queryKey: ['surcharge-rules', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surcharge_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .order('type')
        .order('priority');

      if (error) throw error;
      return data as SurchargeRule[];
    },
    enabled: !!organizationId
  });
};

export const useCreateSurchargeRule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<SurchargeRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('surcharge_rules')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      toast({ title: "Success", description: "Surcharge rule created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

// Client Pricing Overrides hooks
export const useClientPricingOverrides = (organizationId: string, clientId?: string) => {
  return useQuery({
    queryKey: ['client-pricing-overrides', organizationId, clientId],
    queryFn: async () => {
      let query = supabase
        .from('client_pricing_overrides')
        .select('*')
        .eq('organization_id', organizationId);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query
        .order('tire_category')
        .order('service_mode');

      if (error) throw error;
      return data as ClientPricingOverride[];
    },
    enabled: !!organizationId
  });
};

export const useCreateClientPricingOverride = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<ClientPricingOverride, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('client_pricing_overrides')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-pricing-overrides'] });
      toast({ title: "Success", description: "Client pricing override created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

// Location Pricing Overrides hooks
export const useLocationPricingOverrides = (organizationId: string, locationId?: string) => {
  return useQuery({
    queryKey: ['location-pricing-overrides', organizationId, locationId],
    queryFn: async () => {
      let query = supabase
        .from('location_pricing_overrides')
        .select('*')
        .eq('organization_id', organizationId);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query
        .order('tire_category')
        .order('service_mode');

      if (error) throw error;
      return data as LocationPricingOverride[];
    },
    enabled: !!organizationId
  });
};

export const useCreateLocationPricingOverride = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<LocationPricingOverride, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('location_pricing_overrides')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-pricing-overrides'] });
      toast({ title: "Success", description: "Location pricing override created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};