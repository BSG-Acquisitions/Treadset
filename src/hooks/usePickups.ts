import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Pickup = Database["public"]["Tables"]["pickups"]["Row"];
type PickupInsert = Database["public"]["Tables"]["pickups"]["Insert"];
type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
type AssignmentInsert = Database["public"]["Tables"]["assignments"]["Insert"];

export interface SchedulePickupData {
  clientId: string;
  locationId?: string;
  pickupDate: string;
  pteCount: number;
  otrCount: number;
  tractorCount: number;
  preferredWindow: 'AM' | 'PM' | 'Any';
  notes?: string;
}

export interface RouteOption {
  vehicleId: string;
  vehicleName: string;
  eta: Date;
  windowLabel: string;
  addedTravelTimeMinutes: number;
  remainingCapacity: number;
}

export const usePickups = (date?: string) => {
  return useQuery({
    queryKey: ['pickups', date],
    queryFn: async () => {
      let query = supabase
        .from('pickups')
        .select(`
          *,
          client:client_id(company_name),
          location:location_id(name, address)
        `);

      if (date) {
        query = query.eq('pickup_date', date);
      }

      const { data, error } = await query.order('pickup_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });
};

export const useAssignments = (date?: string) => {
  return useQuery({
    queryKey: ['assignments', date],
    queryFn: async () => {
      let query = supabase.from('assignments')
        .select(`
          *,
          pickup:pickups(*,
            client:clients(company_name),
            location:locations(address, name)
          ),
          vehicle:vehicles(name, capacity),
          assigned_driver:users!driver_id(
            id,
            first_name,
            last_name,
            email
          )
        `);
      
      if (date) {
        query = query.eq('scheduled_date', date);
      }
      
      const { data, error } = await query.order('estimated_arrival', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
  });
};

export const useSchedulePickup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SchedulePickupData): Promise<{ pickup: Pickup; assignment: Assignment; options: RouteOption[] }> => {
      // Call the route planner edge function
      const { data: plannerResult, error: plannerError } = await supabase.functions.invoke('route-planner', {
        body: {
          clientId: data.clientId,
          locationId: data.locationId,
          pickupDate: data.pickupDate,
          pteCount: data.pteCount,
          preferredWindow: data.preferredWindow
        }
      });

      if (plannerError) throw plannerError;

      if (!plannerResult?.options || plannerResult.options.length === 0) {
        throw new Error('No available slots found for the requested date and requirements');
      }

      // Use the best option (first in the sorted list)
      const bestOption = plannerResult.options[0];

      // Get current organization ID
      const orgSlug = 'bsg'; // For now, default to BSG
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

      // Create the assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          pickup_id: pickup.id,
          vehicle_id: bestOption.vehicleId,
          organization_id: orgData,
          scheduled_date: data.pickupDate,
          estimated_arrival: bestOption.eta,
          sequence_order: bestOption.insertionIndex || 0
        })
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      return {
        pickup,
        assignment,
        options: plannerResult.options
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast({
        title: "Success",
        description: "Pickup scheduled successfully",
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

export const useDeletePickup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (pickupId: string) => {
      // First, delete any related assignments
      const { error: assignmentError } = await supabase
        .from('assignments')
        .delete()
        .eq('pickup_id', pickupId);

      if (assignmentError) throw assignmentError;

      // Then delete the pickup
      const { error: pickupError } = await supabase
        .from('pickups')
        .delete()
        .eq('id', pickupId);

      if (pickupError) throw pickupError;

      return pickupId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast({
        title: "Success",
        description: "Pickup deleted successfully",
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