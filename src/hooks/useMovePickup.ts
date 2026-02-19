import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MovePickupData {
  pickupId: string;
  newDate: string;
  oldDate?: string;
}

export const useMovePickup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ pickupId, newDate, oldDate }: MovePickupData) => {
      const { error: pickupError } = await supabase
        .from('pickups')
        .update({ pickup_date: newDate })
        .eq('id', pickupId);

      if (pickupError) throw pickupError;

      const { error: assignmentError } = await supabase
        .from('assignments')
        .update({ scheduled_date: newDate })
        .eq('pickup_id', pickupId);

      if (assignmentError) throw assignmentError;

      return { pickupId, newDate, oldDate };
    },
    onSuccess: (data) => {
      // Force immediate refetch of both the source and destination day columns,
      // bypassing staleTime so the UI updates instantly after drag-and-drop.
      queryClient.refetchQueries({ queryKey: ['pickups'], type: 'active' });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      
      toast({
        title: "Pickup Moved",
        description: `Pickup has been successfully moved to ${new Date(data.newDate + 'T00:00:00').toLocaleDateString()}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Move Failed",
        description: error.message || "Failed to move pickup",
        variant: "destructive",
      });
    }
  });
};