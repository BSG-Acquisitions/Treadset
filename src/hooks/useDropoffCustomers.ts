import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type DropoffCustomer = Database["public"]["Tables"]["dropoff_customers"]["Row"];
type DropoffCustomerInsert = Database["public"]["Tables"]["dropoff_customers"]["Insert"];
type DropoffCustomerUpdate = Database["public"]["Tables"]["dropoff_customers"]["Update"];

export const useDropoffCustomers = () => {
  return useQuery({
    queryKey: ['dropoff-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dropoff_customers')
        .select(`
          *,
          pricing_tiers(name, pte_rate, otr_rate, tractor_rate)
        `)
        .order('contact_name');
      
      if (error) throw error;
      return data || [];
    }
  });
};

export const useDropoffCustomer = (id: string) => {
  return useQuery({
    queryKey: ['dropoff-customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dropoff_customers')
        .select(`
          *,
          pricing_tiers(name, pte_rate, otr_rate, tractor_rate)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
};

export const useCreateDropoffCustomer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customer: DropoffCustomerInsert) => {
      const { data, error } = await supabase
        .from('dropoff_customers')
        .insert(customer)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropoff-customers'] });
      toast({ title: "Success", description: "Drop-off customer created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

export const useUpdateDropoffCustomer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DropoffCustomerUpdate }) => {
      const { data, error } = await supabase
        .from('dropoff_customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropoff-customers'] });
      toast({ title: "Success", description: "Drop-off customer updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

export const useDeleteDropoffCustomer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dropoff_customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropoff-customers'] });
      toast({ title: "Success", description: "Drop-off customer deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};