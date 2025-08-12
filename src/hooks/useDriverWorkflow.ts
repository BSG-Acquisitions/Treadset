import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpdateAssignmentStatusData {
  assignmentId: string;
  status: 'in_progress' | 'completed';
  completionData?: {
    actualCounts?: {
      pte: number;
      otr: number;
      tractor: number;
    };
    manifestUrl?: string | null;
    notes?: string | null;
    photos?: File[] | null;
  };
}

export const useUpdateAssignmentStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateAssignmentStatusData) => {
      const updates: any = {
        status: data.status,
        updated_at: new Date().toISOString()
      };

      // If completing, add actual arrival time
      if (data.status === 'completed') {
        updates.actual_arrival = new Date().toISOString();
      }

      // Update assignment status
      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .update(updates)
        .eq('id', data.assignmentId)
        .select('pickup_id')
        .single();

      if (assignmentError) throw assignmentError;

      // If completing and we have completion data, update the pickup
      if (data.status === 'completed' && data.completionData) {
        const pickupUpdates: any = {
          status: 'completed',
          updated_at: new Date().toISOString()
        };

        // Update actual counts if provided
        if (data.completionData.actualCounts) {
          pickupUpdates.pte_count = data.completionData.actualCounts.pte;
          pickupUpdates.otr_count = data.completionData.actualCounts.otr;
          pickupUpdates.tractor_count = data.completionData.actualCounts.tractor;
        }

        const { error: pickupError } = await supabase
          .from('pickups')
          .update(pickupUpdates)
          .eq('id', assignment.pickup_id);

        if (pickupError) throw pickupError;

        // TODO: Handle photo uploads to storage if needed
        // TODO: Store manifest URL and notes in completion data table
      }

      return assignment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      
      const statusText = variables.status === 'completed' ? 'completed' : 'started';
      toast({ 
        title: "Status Updated", 
        description: `Pickup ${statusText} successfully` 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });
};