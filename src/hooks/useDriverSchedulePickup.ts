import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface DriverSchedulePickupData {
  clientId: string;
  locationId?: string;
  pickupDate: string;
  pteCount: number;
  otrCount: number;
  tractorCount: number;
  preferredWindow: 'AM' | 'PM' | 'Any';
  notes?: string;
}

interface ScheduleResult {
  pickup_id: string;
  assignment_id: string;
}

export const useDriverSchedulePickup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: DriverSchedulePickupData): Promise<ScheduleResult> => {
      // Get the driver's vehicle and organization
      const userEmail = user?.email;
      if (!userEmail) {
        throw new Error("Not authenticated");
      }

      // Get the driver's user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError || !userData) {
        throw new Error("Could not find user record");
      }

      const driverId = userData.id;

      // Get the driver's assigned vehicle
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, organization_id')
        .or(`driver_email.ilike.${userEmail},assigned_driver_id.eq.${driverId}`)
        .limit(1)
        .maybeSingle();

      if (vehicleError) {
        throw new Error("Error finding vehicle: " + vehicleError.message);
      }

      if (!vehicleData) {
        throw new Error("You don't have an assigned vehicle. Please contact your dispatcher.");
      }

      // Get organization from client if vehicle doesn't have one
      let organizationId = vehicleData.organization_id;
      if (!organizationId) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('organization_id')
          .eq('id', data.clientId)
          .single();

        if (clientError || !clientData?.organization_id) {
          throw new Error("Could not find organization for this client");
        }
        organizationId = clientData.organization_id;
      }

      // Call the atomic RPC function
      const { data: result, error: rpcError } = await supabase.rpc('driver_schedule_pickup', {
        p_client_id: data.clientId,
        p_location_id: data.locationId || null,
        p_organization_id: organizationId,
        p_pickup_date: data.pickupDate,
        p_pte_count: data.pteCount,
        p_otr_count: data.otrCount,
        p_tractor_count: data.tractorCount,
        p_preferred_window: data.preferredWindow,
        p_notes: data.notes || null,
        p_vehicle_id: vehicleData.id,
        p_driver_id: driverId,
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw new Error(rpcError.message);
      }

      return result as unknown as ScheduleResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      toast({
        title: "Success",
        description: "Pickup scheduled and added to your route",
      });
    },
    onError: (error) => {
      console.error('Schedule pickup error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};
