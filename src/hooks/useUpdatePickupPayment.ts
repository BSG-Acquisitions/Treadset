import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpdatePickupPaymentParams {
  pickupId: string;
  clientId: string;
  transaction_type?: 'pickup' | 'dropoff';
  computed_revenue?: number;
  payment_method?: string;
}

export const useUpdatePickupPayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ pickupId, transaction_type = 'pickup', computed_revenue, payment_method }: UpdatePickupPaymentParams) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      
      if (computed_revenue !== undefined) {
        updateData.computed_revenue = computed_revenue;
        // Only pickups have final_revenue field
        if (transaction_type === 'pickup') {
          updateData.final_revenue = computed_revenue;
        }
      }
      
      if (payment_method !== undefined) {
        updateData.payment_method = payment_method;
      }

      // Select the correct table based on transaction type
      const tableName = transaction_type === 'dropoff' ? 'dropoffs' : 'pickups';

      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', pickupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      
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
