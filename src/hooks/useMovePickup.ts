import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MovePickupData {
  pickupId: string;
  newDate: string;
}

export const useMovePickup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ pickupId, newDate }: MovePickupData) => {
      // Update the pickup date
      const { error: pickupError } = await supabase
        .from('pickups')
        .update({ pickup_date: newDate })
        .eq('id', pickupId);

      if (pickupError) throw pickupError;

      // Update any related assignments
      const { error: assignmentError } = await supabase
        .from('assignments')
        .update({ scheduled_date: newDate })
        .eq('pickup_id', pickupId);

      if (assignmentError) throw assignmentError;

      return { pickupId, newDate };
    },
    onSuccess: (data) => {
      // Invalidate all pickup and assignment queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      
      toast({
        title: "Pickup Moved",
        description: `Pickup has been successfully moved to ${new Date(data.newDate).toLocaleDateString()}`,
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