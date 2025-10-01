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

        // Calculate revenue after updating counts
        // Get organization default rates for revenue calculation
        const { data: orgSettings } = await supabase
          .from('organization_settings')
          .select('default_pte_rate, default_otr_rate, default_tractor_rate')
          .single();

        if (orgSettings && data.completionData.actualCounts) {
          const pteRevenue = data.completionData.actualCounts.pte * (orgSettings.default_pte_rate || 0);
          const otrRevenue = data.completionData.actualCounts.otr * (orgSettings.default_otr_rate || 0);
          const tractorRevenue = data.completionData.actualCounts.tractor * (orgSettings.default_tractor_rate || 0);
          const totalRevenue = pteRevenue + otrRevenue + tractorRevenue;

          // Update computed revenue
          const { error: revenueError } = await supabase
            .from('pickups')
            .update({ computed_revenue: totalRevenue })
            .eq('id', assignment.pickup_id);

          if (revenueError) {
            console.error('Failed to update revenue:', revenueError);
          } else {
            console.log('Revenue calculated:', totalRevenue);
          }
        }

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