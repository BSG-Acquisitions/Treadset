import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

export interface CreateHaulerData {
  hauler_name: string;
  hauler_mailing_address?: string;
  hauler_city?: string;
  hauler_state?: string;
  hauler_zip?: string;
  hauler_phone?: string;
  hauler_mi_reg?: string;
}

export const useHaulers = () => {
  return useQuery({
    queryKey: ["haulers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("haulers")
        .select("*")
        .eq("is_active", true)
        .order("hauler_name");

      if (error) throw error;
      return data as Hauler[];
    },
  });
};

export const useCreateHauler = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateHaulerData) => {
      const { data: hauler, error } = await supabase
        .from("haulers")
        .insert({
          ...data,
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
      const { data: hauler, error } = await supabase
        .from("haulers")
        .update(data)
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
      const { error } = await supabase
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