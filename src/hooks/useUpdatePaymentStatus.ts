import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpdatePaymentStatusParams {
  pickupId: string;
  paymentStatus: 'PENDING' | 'SUCCEEDED' | 'FAILED';
}

export const useUpdatePaymentStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ pickupId, paymentStatus }: UpdatePaymentStatusParams) => {
      const { data, error } = await supabase
        .from('pickups')
        .update({ 
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', pickupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      
      toast({
        title: "Payment Status Updated",
        description: `Payment marked as ${variables.paymentStatus.toLowerCase()}`,
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
