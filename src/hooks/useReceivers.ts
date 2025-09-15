import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Receiver {
  id: string;
  receiver_name: string;
  receiver_mailing_address?: string;
  receiver_city?: string;
  receiver_state?: string;
  receiver_zip?: string;
  receiver_phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateReceiverData {
  receiver_name: string;
  receiver_mailing_address?: string;
  receiver_city?: string;
  receiver_state?: string;
  receiver_zip?: string;
  receiver_phone?: string;
}

export const useReceivers = () => {
  return useQuery({
    queryKey: ["receivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receivers")
        .select("*")
        .eq("is_active", true)
        .order("receiver_name");

      if (error) throw error;
      return data as Receiver[];
    },
  });
};

export const useCreateReceiver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReceiverData) => {
      const { data: receiver, error } = await supabase
        .from("receivers")
        .insert({
          ...data,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return receiver;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivers"] });
      toast.success("Receiver created successfully");
    },
    onError: (error) => {
      console.error("Error creating receiver:", error);
      toast.error("Failed to create receiver");
    },
  });
};

export const useUpdateReceiver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateReceiverData> }) => {
      const { data: receiver, error } = await supabase
        .from("receivers")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return receiver;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivers"] });
      toast.success("Receiver updated successfully");
    },
    onError: (error) => {
      console.error("Error updating receiver:", error);
      toast.error("Failed to update receiver");
    },
  });
};

export const useDeleteReceiver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("receivers")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivers"] });
      toast.success("Receiver deactivated successfully");
    },
    onError: (error) => {
      console.error("Error deleting receiver:", error);
      toast.error("Failed to deactivate receiver");
    },
  });
};