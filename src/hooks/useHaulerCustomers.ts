import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HaulerCustomer {
  id: string;
  hauler_id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateHaulerCustomerData {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

// Get customers for a hauler
export const useHaulerCustomers = (haulerId?: string) => {
  return useQuery({
    queryKey: ["hauler-customers", haulerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hauler_customers" as any)
        .select("*")
        .eq("hauler_id", haulerId!)
        .eq("is_active", true)
        .order("company_name");

      if (error) throw error;
      return data as any as HaulerCustomer[];
    },
    enabled: !!haulerId,
  });
};

// Create customer
export const useCreateHaulerCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      haulerId, 
      data 
    }: { 
      haulerId: string; 
      data: CreateHaulerCustomerData 
    }) => {
      const { data: customer, error } = await supabase
        .from("hauler_customers" as any)
        .insert({
          hauler_id: haulerId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hauler-customers"] });
      toast.success("Customer created successfully");
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
      toast.error("Failed to create customer");
    },
  });
};

// Update customer
export const useUpdateHaulerCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<CreateHaulerCustomerData> 
    }) => {
      const { data: customer, error } = await supabase
        .from("hauler_customers" as any)
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hauler-customers"] });
      toast.success("Customer updated successfully");
    },
    onError: (error) => {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer");
    },
  });
};

// Delete customer (soft delete)
export const useDeleteHaulerCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hauler_customers" as any)
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hauler-customers"] });
      toast.success("Customer deactivated successfully");
    },
    onError: (error) => {
      console.error("Error deleting customer:", error);
      toast.error("Failed to deactivate customer");
    },
  });
};
