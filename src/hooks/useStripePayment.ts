import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { useAuth } from "@/contexts/AuthContext";

export interface CreatePaymentParams {
  amount: number; // Amount in dollars
  description: string;
  customer_email?: string;
  customer_name?: string;
  client_id?: string;
  pickup_id?: string;
  manifest_id?: string;
  metadata?: Record<string, any>;
}

export interface VerifyPaymentParams {
  session_id: string;
}

export const useCreatePayment = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreatePaymentParams) => {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log("Payment session created:", data);
      // Open Stripe checkout in a new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (err: any) => {
      toast({
        title: "Payment Error",
        description: err?.message ?? "Failed to create payment session.",
        variant: "destructive",
      });
    },
  });
};

export const useVerifyPayment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createNotification } = useEnhancedNotifications();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: VerifyPaymentParams) => {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      if (data.payment.status === 'paid') {
        toast({
          title: "Payment Successful",
          description: "Payment has been processed successfully.",
        });

        // Create notification for successful payment
        if (user?.currentOrganization) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();

          if (userData) {
            const amount = data.payment.amount ? `$${(data.payment.amount / 100).toFixed(2)}` : '';
            createNotification({
              user_id: userData.id,
              organization_id: user.currentOrganization.id,
              title: "Payment Received",
              message: `Stripe payment of ${amount} was successfully processed${data.payment.description ? ` for ${data.payment.description}` : ''}.`,
              type: 'success',
              priority: 'medium',
              related_type: 'payment',
              related_id: data.payment.id,
            });
          }
        }
      }
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["manifests"] });
      queryClient.invalidateQueries({ queryKey: ["pickups"] });
    },
    onError: (err: any) => {
      toast({
        title: "Payment Verification Error",
        description: err?.message ?? "Failed to verify payment.",
        variant: "destructive",
      });
    },
  });
};