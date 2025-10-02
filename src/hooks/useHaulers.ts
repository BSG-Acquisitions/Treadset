import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Interface matching the ACTUAL current database schema
export interface Hauler {
  id: string;
  hauler_name: string;
  hauler_mailing_address?: string;
  hauler_city?: string;
  hauler_state?: string;
  hauler_zip?: string;
  hauler_phone?: string;
  hauler_mi_reg?: string;
  is_active: boolean;
  created_at: string;
  // New fields for future use
  user_id?: string;
  email?: string;
  dot_number?: string;
  license_number?: string;
  // Computed fields for display
  company_name?: string; // Will be mapped from hauler_name
  phone?: string; // Will be mapped from hauler_phone
  mailing_address?: string; // Will be mapped from hauler_mailing_address
  city?: string; // Will be mapped from hauler_city
  state?: string; // Will be mapped from hauler_state
  zip?: string; // Will be mapped from hauler_zip
}

export interface CreateHaulerData {
  hauler_name: string; // Using actual DB column name
  hauler_mailing_address?: string;
  hauler_city?: string;
  hauler_state?: string;
  hauler_zip?: string;
  hauler_phone?: string;
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
        .order("hauler_name");

      if (error) throw error;
      
      // Map old schema to include both old and new field names for compatibility
      return (data as any[]).map(hauler => ({
        ...hauler,
        company_name: hauler.hauler_name,
        phone: hauler.hauler_phone,
        mailing_address: hauler.hauler_mailing_address,
        city: hauler.hauler_city,
        state: hauler.hauler_state,
        zip: hauler.hauler_zip,
      })) as Hauler[];
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
          hauler_name: data.hauler_name,
          hauler_mailing_address: data.hauler_mailing_address,
          hauler_city: data.hauler_city,
          hauler_state: data.hauler_state,
          hauler_zip: data.hauler_zip,
          hauler_phone: data.hauler_phone,
          hauler_mi_reg: data.hauler_mi_reg,
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
          hauler_name: data.hauler_name,
          hauler_mailing_address: data.hauler_mailing_address,
          hauler_city: data.hauler_city,
          hauler_state: data.hauler_state,
          hauler_zip: data.hauler_zip,
          hauler_phone: data.hauler_phone,
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