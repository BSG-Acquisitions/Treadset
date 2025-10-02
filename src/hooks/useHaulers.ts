import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Legacy interface for backward compatibility
export interface Hauler {
  id: string;
  company_name: string;
  mailing_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  hauler_mi_reg?: string;
  is_active: boolean;
  created_at: string;
  user_id?: string;
  email?: string;
  dot_number?: string;
  license_number?: string;
}

export interface CreateHaulerData {
  company_name: string;
  mailing_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  hauler_mi_reg?: string;
  email?: string;
}

export const useHaulers = () => {
  return useQuery({
    queryKey: ["haulers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("haulers")
        .select("*")
        .eq("is_active", true)
        .order("company_name");

      if (error) throw error;
      return data as Hauler[];
    },
  });
};

export const useCreateHauler = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateHaulerData) => {
      // Create simple hauler (no user account) - used for Michigan manifests
      const { data: hauler, error } = await (supabase as any)
        .from("haulers")
        .insert({
          company_name: data.company_name,
          mailing_address: data.mailing_address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          phone: data.phone,
          hauler_mi_reg: data.hauler_mi_reg,
          email: data.email || `${data.company_name.toLowerCase().replace(/\s+/g, '-')}@temp.hauler`,
          user_id: null, // No user account for simple haulers
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return hauler;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["haulers"] });
      toast.success("Hauler created successfully");
    },
    onError: (error) => {
      console.error("Error creating hauler:", error);
      toast.error("Failed to create hauler");
    },
  });
};

export const useUpdateHauler = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateHaulerData> }) => {
      const { data: hauler, error } = await (supabase as any)
        .from("haulers")
        .update({
          company_name: data.company_name,
          mailing_address: data.mailing_address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          phone: data.phone,
          hauler_mi_reg: data.hauler_mi_reg,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return hauler;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["haulers"] });
      toast.success("Hauler updated successfully");
    },
    onError: (error) => {
      console.error("Error updating hauler:", error);
      toast.error("Failed to update hauler");
    },
  });
};

export const useDeleteHauler = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("haulers")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["haulers"] });
      toast.success("Hauler deactivated successfully");
    },
    onError: (error) => {
      console.error("Error deleting hauler:", error);
      toast.error("Failed to deactivate hauler");
    },
  });
};