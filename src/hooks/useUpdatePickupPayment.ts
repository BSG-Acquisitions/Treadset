import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpdatePickupPaymentParams {
  pickupId: string;
  computed_revenue?: number;
  payment_method?: string;
}

export const useUpdatePickupPayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ pickupId, computed_revenue, payment_method }: UpdatePickupPaymentParams) => {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (computed_revenue !== undefined) {
        updateData.computed_revenue = computed_revenue;
        updateData.final_revenue = computed_revenue;
      }
      
      if (payment_method !== undefined) {
        updateData.payment_method = payment_method;
      }

      const { data, error } = await supabase
        .from('pickups')
        .update(updateData)
        .eq('id', pickupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      
      toast({
        title: "Payment Updated",
        description: "Payment details have been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
