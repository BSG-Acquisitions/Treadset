import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Dropoff = Database["public"]["Tables"]["dropoffs"]["Row"];
type DropoffInsert = Database["public"]["Tables"]["dropoffs"]["Insert"];
type DropoffUpdate = Database["public"]["Tables"]["dropoffs"]["Update"];

export const useDropoffs = (customerId?: string) => {
  return useQuery({
    queryKey: ['dropoffs', customerId],
    queryFn: async () => {
      let query = supabase
        .from('dropoffs')
        .select(`
          *,
          clients(contact_name, company_name, email, phone),
          users:processed_by(first_name, last_name, email),
          pricing_tiers(name)
        `);
      
      if (customerId) {
        query = query.eq('client_id', customerId);
      }
      
      const { data, error } = await query.order('dropoff_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    refetchOnWindowFocus: true,
    staleTime: 0
  });
};

export const useDropoff = (id: string) => {
  return useQuery({
    queryKey: ['dropoff', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dropoffs')
        .select(`
          *,
          clients(contact_name, company_name, email, phone),
          users:processed_by(first_name, last_name, email),
          pricing_tiers(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
};

export const useCreateDropoff = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (dropoff: DropoffInsert) => {
      const { data, error } = await supabase
        .from('dropoffs')
        .insert(dropoff)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['todays-dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-tire-totals'] });
      queryClient.invalidateQueries({ queryKey: ['yesterday-tire-totals'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-tire-totals'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-stats'] });
      toast({ title: "Success", description: "Drop-off processed successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

export const useUpdateDropoff = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DropoffUpdate }) => {
      const { data, error } = await supabase
        .from('dropoffs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropoffs'] });
      toast({ title: "Success", description: "Drop-off updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

export const useTodaysDropoffs = () => {
  return useQuery({
    queryKey: ['todays-dropoffs'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('dropoffs')
        .select(`
          *,
          clients(contact_name, company_name)
        `)
        .eq('dropoff_date', today)
        .order('dropoff_time', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });
};