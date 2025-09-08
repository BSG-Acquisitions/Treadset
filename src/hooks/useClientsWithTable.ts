import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TableState } from "@/hooks/useDataTable";

interface UseClientsWithTableOptions {
  tableState: TableState;
}

export const useClientsWithTable = ({ tableState }: UseClientsWithTableOptions) => {
  return useQuery({
    queryKey: ['clients-table', tableState],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select(`
          *,
          pricing_tier:pricing_tiers(name),
          locations:locations(count, address, access_notes),
          pickups:pickups(count)
        `, { count: 'exact' });

      // Apply search
      if (tableState.search) {
        query = query.or(`company_name.ilike.%${tableState.search}%,contact_name.ilike.%${tableState.search}%,email.ilike.%${tableState.search}%`);
      }

      // Apply filters
      if (tableState.filters.type) {
        query = query.eq('type', tableState.filters.type);
      }
      if (tableState.filters.pricing_tier_id) {
        query = query.eq('pricing_tier_id', tableState.filters.pricing_tier_id);
      }
      if (tableState.filters.is_active !== undefined) {
        query = query.eq('is_active', tableState.filters.is_active);
      }

      // Apply sorting
      const ascending = tableState.sortOrder === 'asc';
      query = query.order(tableState.sortBy, { ascending });

      // Apply pagination
      const from = (tableState.page - 1) * tableState.pageSize;
      const to = from + tableState.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data || [],
        totalCount: count || 0
      };
    }
  });
};