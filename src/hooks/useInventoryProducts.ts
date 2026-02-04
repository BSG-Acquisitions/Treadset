import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface InventoryProduct {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: string;
  unit_of_measure: string;
  sku: string | null;
  low_stock_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  category: string;
  unit_of_measure: string;
  sku?: string;
  low_stock_threshold?: number;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
  is_active?: boolean;
}

export const PRODUCT_CATEGORIES = [
  { value: 'shred', label: 'Shred' },
  { value: 'mulch', label: 'Rubber Mulch' },
  { value: 'tda', label: 'TDA (Tire Derived Aggregate)' },
  { value: 'tdf', label: 'TDF (Tire Derived Fuel)' },
  { value: 'crumb', label: 'Crumb Rubber' },
  { value: 'molded', label: 'Molded Products' },
  { value: 'wire', label: 'Wire/Steel' },
  { value: 'textile', label: 'Textile/Fiber' },
  { value: 'other', label: 'Other' },
] as const;

export const UNITS_OF_MEASURE = [
  { value: 'tons', label: 'Tons' },
  { value: 'lbs', label: 'Pounds' },
  { value: 'cubic_yards', label: 'Cubic Yards' },
  { value: 'units', label: 'Units' },
  { value: 'pallets', label: 'Pallets' },
] as const;

export const useInventoryProducts = (includeInactive = false) => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['inventory-products', orgId, includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('inventory_products')
        .select('*')
        .eq('organization_id', orgId!)
        .order('name');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InventoryProduct[];
    },
    enabled: !!orgId,
  });
};

export const useCreateInventoryProduct = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const { data, error } = await supabase
        .from('inventory_products')
        .insert({
          ...input,
          organization_id: orgId!,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InventoryProduct;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      toast({
        title: "Product Created",
        description: `${data.name} has been added to your inventory catalog.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateInventoryProduct = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProductInput) => {
      const { data, error } = await supabase
        .from('inventory_products')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InventoryProduct;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      toast({
        title: "Product Updated",
        description: `${data.name} has been updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteInventoryProduct = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      toast({
        title: "Product Deleted",
        description: "The product has been removed from your catalog.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
