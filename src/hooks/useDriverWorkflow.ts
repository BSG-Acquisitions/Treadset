import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSendManifestEmail } from "./useSendManifestEmail";

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
  const sendManifestEmail = useSendManifestEmail();

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

      // Update assignment status and get pickup details
      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .update(updates)
        .eq('id', data.assignmentId)
        .select(`
          pickup_id,
          pickups:pickup_id(
            id, client_id, organization_id, manifest_id,
            clients:client_id(id, company_name, email, organization_id)
          )
        `)
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

        // Get pickup and client info for workflow automation
        const pickup = assignment.pickups;
        const client = pickup?.clients;

        if (pickup && client) {
          // Create or update client workflow for followup
          try {
            const followupDate = new Date();
            followupDate.setDate(followupDate.getDate() + 30); // 30 days from now

            const { error: workflowError } = await supabase
              .from('client_workflows')
              .upsert({
                client_id: client.id,
                organization_id: client.organization_id,
                workflow_type: 'followup',
                status: 'active',
                next_contact_date: followupDate.toISOString().split('T')[0],
                last_contact_date: new Date().toISOString().split('T')[0],
                contact_frequency_days: 30,
                notes: `Auto-created after pickup completion on ${new Date().toLocaleDateString()}`
              });
            
            if (workflowError) {
              console.error('Failed to create workflow:', workflowError);
            } else {
              console.log('Client workflow updated for followup');
            }
          } catch (error) {
            console.error('Failed to create workflow:', error);
            // Don't fail the entire completion if workflow creation fails
          }
        }

        // TODO: Handle photo uploads to storage if needed
      }

      return assignment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      
      const statusText = variables.status === 'completed' ? 'completed' : 'started';
      let description = `Pickup ${statusText} successfully`;
      
      if (variables.status === 'completed') {
        description += '. Manifest created and ready for admin review.';
      }
      
      toast({ 
        title: "Status Updated", 
        description 
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