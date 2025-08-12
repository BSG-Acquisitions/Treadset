import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

interface ClientsQueryParams {
  search?: string;
  type?: string;
  tags?: string[];
  sortBy?: 'updated_at' | 'lifetime_revenue' | 'company_name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const useClients = (params: ClientsQueryParams = {}) => {
  const { 
    search = '', 
    type, 
    tags = [], 
    sortBy = 'updated_at', 
    sortOrder = 'desc',
    page = 1,
    limit = 10
  } = params;

  return useQuery({
    queryKey: ['clients', search, type, tags, sortBy, sortOrder, page, limit],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select(`
          *,
          pricing_tier:pricing_tier_id(name, rate),
          locations(count)
        `, { count: 'exact' });

      // Search filter
      if (search) {
        query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      // Type filter
      if (type && (type === 'commercial' || type === 'residential' || type === 'industrial')) {
        query = query.eq('type', type);
      }

      // Tags filter
      if (tags.length > 0) {
        query = query.overlaps('tags', tags);
      }

      // Only active clients
      query = query.eq('is_active', true);

      // Sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      };
    }
  });
};

export const useClient = (id: string) => {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          pricing_tier:pricing_tier_id(name, rate),
          locations(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ClientUpdate }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if client has open balance
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('open_balance')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (client.open_balance && client.open_balance > 0) {
        // Soft delete if open balance exists
        const { error } = await supabase
          .from('clients')
          .update({ is_active: false })
          .eq('id', id);

        if (error) throw error;
        return { softDeleted: true };
      } else {
        // Hard delete if no open balance
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { softDeleted: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: "Success",
        description: result.softDeleted 
          ? "Client deactivated due to open balance" 
          : "Client deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};