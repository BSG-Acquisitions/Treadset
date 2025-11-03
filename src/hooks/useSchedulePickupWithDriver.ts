import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { sanitizeUUID } from "@/lib/uuidHelpers";

type Pickup = Database["public"]["Tables"]["pickups"]["Row"];
type Assignment = Database["public"]["Tables"]["assignments"]["Row"];

export interface SchedulePickupWithDriverData {
  clientId: string;
  locationId?: string;
  vehicleId?: string;
  haulerId?: string;
  driverId?: string;
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
      // Get organization_id from the client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('organization_id')
        .eq('id', data.clientId)
        .single();

      if (clientError || !clientData?.organization_id) {
        throw new Error("Could not find organization for this client");
      }

      const organizationId = clientData.organization_id;
      
      // Create the pickup
      const { data: pickup, error: pickupError } = await supabase
        .from('pickups')
        .insert({
          client_id: data.clientId,
          location_id: sanitizeUUID(data.locationId),
          organization_id: organizationId,
          pickup_date: data.pickupDate,
          pte_count: data.pteCount,
          otr_count: data.otrCount,
          tractor_count: data.tractorCount,
          preferred_window: data.preferredWindow,
          notes: data.notes && data.notes.trim() !== '' ? data.notes : null
        })
        .select()
        .single();

      if (pickupError) throw pickupError;

      // Create the assignment with specified driver and vehicle/hauler
      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          pickup_id: pickup.id,
          vehicle_id: sanitizeUUID(data.vehicleId),
          hauler_id: sanitizeUUID(data.haulerId),
          driver_id: sanitizeUUID(data.driverId),
          organization_id: organizationId,
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