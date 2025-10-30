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
  assignmentType?: 'vehicle' | 'hauler' | 'auto';
  vehicleId?: string;
  haulerId?: string;
  driverId?: string;
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
      // Get the current organization ID first
      const { data: orgData } = await supabase.rpc('get_current_user_organization', { org_slug: 'bsg' });
      
      let query = supabase
        .from('pickups')
        .select(`
          *,
          client:client_id(
            company_name, 
            contact_name, 
            email, 
            phone,
            mailing_address,
            city,
            state,
            zip,
            county,
            physical_address,
            physical_city,
            physical_state,
            physical_zip
          ),
          location:location_id(name, address),
          daily_assignments:assignments(
            id,
            vehicle_id,
            driver_id,
            status,
            scheduled_date,
            vehicle:vehicles(id, name, capacity),
            assigned_driver:users!driver_id(
              id,
              first_name,
              last_name,
              email
            )
          ),
          manifests(
            id,
            manifest_number,
            pte_on_rim,
            pte_off_rim,
            otr_count,
            tractor_count,
            commercial_17_5_19_5_off,
            commercial_17_5_19_5_on,
            commercial_22_5_off,
            commercial_22_5_on,
            total,
            status
          )
        `)
        .eq('organization_id', orgData); // Explicitly filter by organization

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
          hauler:haulers(hauler_name, hauler_mi_reg),
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
    mutationFn: async (data: SchedulePickupData): Promise<{ pickup: Pickup; assignment: Assignment; options?: RouteOption[] }> => {
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

      let assignment: Assignment;
      let options: RouteOption[] | undefined;

      // Handle different assignment types
      if (!data.assignmentType || data.assignmentType === 'auto') {
        // Use the route planner for automatic assignment
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

        const bestOption = plannerResult.options[0];
        options = plannerResult.options;
        
        // Resolve driver based on the vehicle's driver_email so drivers can see assignments per RLS
        let resolvedDriverId: string | null = null;
        if (bestOption?.vehicleId) {
          const { data: vehicleRow } = await supabase
            .from('vehicles')
            .select('driver_email')
            .eq('id', bestOption.vehicleId)
            .single();
          if (vehicleRow?.driver_email) {
            const { data: driverRow } = await supabase
              .from('users')
              .select('id')
              .ilike('email', vehicleRow.driver_email)
              .single();
            resolvedDriverId = driverRow?.id ?? null;
          }
        }
        
        const { data: autoAssignment, error: assignmentError } = await supabase
          .from('assignments')
          .insert({
            pickup_id: pickup.id,
            vehicle_id: bestOption.vehicleId,
            organization_id: orgData,
            scheduled_date: data.pickupDate,
            estimated_arrival: bestOption.eta,
            sequence_order: bestOption.insertionIndex || 0,
            driver_id: resolvedDriverId,
          })
          .select()
          .single();

        if (assignmentError) throw assignmentError;
        assignment = autoAssignment;
      } else {
        // Manual assignment
        const assignmentData: any = {
          pickup_id: pickup.id,
          organization_id: orgData,
          scheduled_date: data.pickupDate,
          sequence_order: 0, // Set to 0 for manual assignments
          status: 'assigned'
        };

        // Set either vehicle_id or hauler_id based on assignment type
        if (data.assignmentType === 'vehicle' && data.vehicleId) {
          assignmentData.vehicle_id = data.vehicleId;
        } else if (data.assignmentType === 'hauler' && data.haulerId) {
          assignmentData.hauler_id = data.haulerId;
        } else {
          throw new Error('Invalid assignment: must specify either vehicle or hauler');
        }

        // Set driver_id if provided
        if (data.driverId && data.driverId !== '') {
          assignmentData.driver_id = data.driverId;
        }
        
        // Fallback: if assigning to a vehicle and no driverId provided, resolve from vehicle's driver_email
        if (!assignmentData.driver_id && assignmentData.vehicle_id) {
          const { data: vehicleRow } = await supabase
            .from('vehicles')
            .select('driver_email')
            .eq('id', assignmentData.vehicle_id)
            .single();
          if (vehicleRow?.driver_email) {
            const { data: driverRow } = await supabase
              .from('users')
              .select('id')
              .ilike('email', vehicleRow.driver_email)
              .single();
            if (driverRow?.id) {
              assignmentData.driver_id = driverRow.id;
            }
          }
        }
        
        const { data: manualAssignment, error: assignmentError } = await supabase
          .from('assignments')
          .insert(assignmentData)
          .select()
          .single();

        if (assignmentError) throw assignmentError;
        assignment = manualAssignment;
      }

      return {
        pickup,
        assignment,
        options
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
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