import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, format, parseISO } from "date-fns";

export interface ProductSalesBreakdown {
  productId: string;
  productName: string;
  category: string;
  totalQuantity: number;
  unitOfMeasure: string;
  transactionCount: number;
}

export interface MonthlyTrend {
  month: string;
  monthLabel: string;
  totalQuantity: number;
  transactionCount: number;
}

export interface InventorySalesSummary {
  totalOutbound: number;
  transactionCount: number;
  uniqueProducts: number;
  uniqueCustomers: number;
}

export interface InventoryReportFilters {
  startDate?: string;
  endDate?: string;
  productId?: string;
  transactionType?: 'inbound' | 'outbound' | 'all';
}

export type DatePreset = 'this_week' | 'this_month' | 'this_quarter' | 'ytd' | 'custom';

export const getDatePresetRange = (preset: DatePreset): { startDate: string; endDate: string } => {
  const today = new Date();
  const endDate = format(today, 'yyyy-MM-dd');
  
  switch (preset) {
    case 'this_week':
      return { startDate: format(startOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd'), endDate };
    case 'this_month':
      return { startDate: format(startOfMonth(today), 'yyyy-MM-dd'), endDate };
    case 'this_quarter':
      return { startDate: format(startOfQuarter(today), 'yyyy-MM-dd'), endDate };
    case 'ytd':
      return { startDate: format(startOfYear(today), 'yyyy-MM-dd'), endDate };
    case 'custom':
    default:
      return { startDate: format(startOfMonth(today), 'yyyy-MM-dd'), endDate };
  }
};

export const useInventoryReports = (filters: InventoryReportFilters = {}) => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  const transactionsQuery = useQuery({
    queryKey: ['inventory-reports', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('inventory_transactions')
        .select(`
          *,
          product:inventory_products(name, category, unit_of_measure)
        `)
        .eq('organization_id', orgId!)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Only filter by outbound if we're specifically looking at sales
      if (filters.transactionType && filters.transactionType !== 'all') {
        query = query.eq('transaction_type', filters.transactionType);
      } else {
        // Default to outbound for sales reports
        query = query.eq('transaction_type', 'outbound');
      }

      if (filters.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Compute derived data from transactions
  const reportData = useMemo(() => {
    const transactions = transactionsQuery.data || [];

    // Summary calculations
    const summary: InventorySalesSummary = {
      totalOutbound: transactions.reduce((sum, t) => sum + (t.quantity || 0), 0),
      transactionCount: transactions.length,
      uniqueProducts: new Set(transactions.map(t => t.product_id)).size,
      uniqueCustomers: new Set(transactions.filter(t => t.customer_name).map(t => t.customer_name)).size,
    };

    // Group by product
    const productMap = new Map<string, ProductSalesBreakdown>();
    transactions.forEach(t => {
      const existing = productMap.get(t.product_id);
      if (existing) {
        existing.totalQuantity += t.quantity || 0;
        existing.transactionCount += 1;
      } else {
        productMap.set(t.product_id, {
          productId: t.product_id,
          productName: t.product?.name || 'Unknown',
          category: t.product?.category || 'unknown',
          totalQuantity: t.quantity || 0,
          unitOfMeasure: t.unit_of_measure,
          transactionCount: 1,
        });
      }
    });
    const byProduct: ProductSalesBreakdown[] = Array.from(productMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    // Monthly trend
    const monthMap = new Map<string, MonthlyTrend>();
    transactions.forEach(t => {
      const date = parseISO(t.transaction_date);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM yyyy');
      
      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.totalQuantity += t.quantity || 0;
        existing.transactionCount += 1;
      } else {
        monthMap.set(monthKey, {
          month: monthKey,
          monthLabel,
          totalQuantity: t.quantity || 0,
          transactionCount: 1,
        });
      }
    });
    const monthlyTrend: MonthlyTrend[] = Array.from(monthMap.values())
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      summary,
      byProduct,
      monthlyTrend,
      transactions,
    };
  }, [transactionsQuery.data]);

  return {
    ...reportData,
    isLoading: transactionsQuery.isLoading,
    error: transactionsQuery.error,
    refetch: transactionsQuery.refetch,
  };
};

// Hook to get all products for filter dropdown
export const useInventoryProductsList = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['inventory-products-list', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_products')
        .select('id, name, category, unit_of_measure')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
};
