import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Pickup = Database["public"]["Tables"]["pickups"]["Row"];
type Assignment = Database["public"]["Tables"]["assignments"]["Row"];

export interface SchedulePickupWithDriverData {
  clientId: string;
  locationId?: string;
  vehicleId: string;
  driverId: string;
  pickupDate: string;
  pteCount: number;
  otrCount: number;
  tractorCount: number;
  preferredWindow: 'AM' | 'PM' | 'Any';
  notes?: string;
}

export const useSchedulePickupWithDriver = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SchedulePickupWithDriverData): Promise<{ pickup: Pickup; assignment: Assignment }> => {
      // Get current organization ID (for now, use BSG default)
      const orgSlug = 'bsg';
      const { data: orgData } = await supabase.rpc('get_current_user_organization', { org_slug: orgSlug });
      
      // Create the pickup
      const { data: pickup, error: pickupError } = await supabase
        .from('pickups')
        .insert({
          client_id: data.clientId,
          location_id: data.locationId,
          organization_id: orgData,
          pickup_date: data.pickupDate,
          pte_count: data.pteCount,
          otr_count: data.otrCount,
          tractor_count: data.tractorCount,
          preferred_window: data.preferredWindow,
          notes: data.notes
        })
        .select()
        .single();

      if (pickupError) throw pickupError;

      // Create the assignment with specified driver and vehicle
      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          pickup_id: pickup.id,
          vehicle_id: data.vehicleId,
          driver_id: data.driverId,  // THIS WAS MISSING!
          organization_id: orgData,
          scheduled_date: data.pickupDate,
          status: 'assigned',
          // Note: We're not setting estimated_arrival here since we don't have route planning
          // This could be added later with route optimization
        })
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      return { pickup, assignment };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      toast({
        title: "Success",
        description: "Pickup scheduled and assigned to driver successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};