import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface InventoryStockLevel {
  product_id: string;
  organization_id: string;
  product_name: string;
  category: string;
  unit_of_measure: string;
  low_stock_threshold: number | null;
  is_active: boolean;
  current_quantity: number;
  last_transaction_date: string | null;
  total_transactions: number;
}

export const useInventoryStock = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['inventory-stock', orgId],
    queryFn: async () => {
      // Query the view for stock levels
      const { data, error } = await supabase
        .from('inventory_stock_levels')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('product_name');

      if (error) throw error;
      return data as InventoryStockLevel[];
    },
    enabled: !!orgId,
  });
};

export const useInventoryStockByProduct = (productId: string) => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['inventory-stock', orgId, productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_stock_levels')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('product_id', productId)
        .single();

      if (error) throw error;
      return data as InventoryStockLevel;
    },
    enabled: !!orgId && !!productId,
  });
};

export const useInventoryStats = () => {
  const { data: stockLevels, isLoading } = useInventoryStock();

  const stats = {
    totalProducts: stockLevels?.length ?? 0,
    lowStockProducts: stockLevels?.filter(
      s => s.low_stock_threshold && s.current_quantity <= s.low_stock_threshold
    ).length ?? 0,
    outOfStockProducts: stockLevels?.filter(
      s => s.current_quantity <= 0
    ).length ?? 0,
    totalQuantity: stockLevels?.reduce((sum, s) => sum + s.current_quantity, 0) ?? 0,
  };

  return { stats, isLoading };
};
