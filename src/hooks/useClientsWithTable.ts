import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClientTableState {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, any>;
}

interface UseClientsWithTableOptions {
  tableState: ClientTableState;
}

export const useClientsWithTable = ({ tableState }: UseClientsWithTableOptions) => {
  return useQuery({
    queryKey: ['clients-table', JSON.stringify(tableState)],
    queryFn: async () => {
      // Build base query with count and include locations
      let query = supabase
        .from('clients')
        .select(`
          *,
          pricing_tier:pricing_tier_id(name, rate),
          locations(id, address, access_notes),
          pickups(count)
        `, { count: 'exact' });

      // Apply search across key fields
      const search = (tableState.search || '').trim();
      if (search) {
        query = query.or(
          `company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      // Apply sorting
      if (tableState.sortBy) {
        query = query.order(tableState.sortBy, { ascending: tableState.sortOrder === 'asc' });
      }

      // Pagination
      query = query.range(
        (tableState.page - 1) * tableState.pageSize,
        tableState.page * tableState.pageSize - 1
      );

      const { data: clients, error, count } = await query;

      if (error) throw error;

      return {
        data: clients || [],
        totalCount: count || 0
      };
    }
  });
};