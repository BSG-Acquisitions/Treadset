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
      // Simple approach to avoid type inference issues
      const { data: clients, error, count } = await supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .range(
          (tableState.page - 1) * tableState.pageSize,
          tableState.page * tableState.pageSize - 1
        );

      if (error) throw error;

      return {
        data: clients || [],
        totalCount: count || 0
      };
    }
  });
};