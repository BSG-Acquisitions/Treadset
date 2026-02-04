import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface InventoryTransaction {
  id: string;
  organization_id: string;
  product_id: string;
  transaction_type: 'inbound' | 'outbound' | 'adjustment';
  quantity: number;
  unit_of_measure: string;
  transaction_date: string;
  reference_type: string | null;
  reference_id: string | null;
  customer_name: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  // Joined data
  product?: {
    name: string;
    category: string;
  };
}

export interface CreateTransactionInput {
  product_id: string;
  transaction_type: 'inbound' | 'outbound' | 'adjustment';
  quantity: number;
  unit_of_measure: string;
  transaction_date: string;
  reference_type?: string;
  customer_name?: string;
  notes?: string;
}

export const TRANSACTION_TYPES = [
  { value: 'inbound', label: 'Inbound (Production/Receiving)' },
  { value: 'outbound', label: 'Outbound (Sale/Shipment)' },
  { value: 'adjustment', label: 'Adjustment (Correction)' },
] as const;

export const REFERENCE_TYPES = [
  { value: 'production', label: 'Production' },
  { value: 'sale', label: 'Sale' },
  { value: 'adjustment', label: 'Inventory Adjustment' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'return', label: 'Return' },
  { value: 'waste', label: 'Waste/Loss' },
] as const;

interface TransactionFilters {
  productId?: string;
  transactionType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export const useInventoryTransactions = (filters: TransactionFilters = {}) => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['inventory-transactions', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('inventory_transactions')
        .select(`
          *,
          product:inventory_products(name, category)
        `)
        .eq('organization_id', orgId!)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters.transactionType) {
        query = query.eq('transaction_type', filters.transactionType);
      }
      if (filters.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InventoryTransaction[];
    },
    enabled: !!orgId,
  });
};

export const useCreateInventoryTransaction = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert({
          ...input,
          organization_id: orgId!,
          recorded_by: user?.id,
        })
        .select(`
          *,
          product:inventory_products(name, category)
        `)
        .single();

      if (error) throw error;
      return data as InventoryTransaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      
      const typeLabel = data.transaction_type === 'inbound' 
        ? 'received' 
        : data.transaction_type === 'outbound' 
          ? 'shipped' 
          : 'adjusted';
      
      toast({
        title: "Transaction Recorded",
        description: `${data.quantity} ${data.unit_of_measure} ${typeLabel} for ${data.product?.name}.`,
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

export const useDeleteInventoryTransaction = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      toast({
        title: "Transaction Deleted",
        description: "The transaction has been removed.",
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
