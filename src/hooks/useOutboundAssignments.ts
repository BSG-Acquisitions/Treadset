import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type MaterialForm = Database['public']['Enums']['material_form'];
type UnitBasis = Database['public']['Enums']['unit_basis'];

export interface OutboundAssignment {
  id: string;
  organization_id: string;
  destination_entity_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  scheduled_date: string;
  material_form: MaterialForm | null;
  estimated_quantity: number | null;
  estimated_unit: UnitBasis | null;
  notes: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  manifest_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutboundAssignmentWithRelations extends OutboundAssignment {
  destination_entity: {
    id: string;
    legal_name: string;
    street_address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
  driver: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  vehicle: {
    id: string;
    name: string;
  } | null;
  manifest: {
    id: string;
    manifest_number: string;
    status: string;
  } | null;
}

// Fetch driver's outbound assignments for a specific date
export function useDriverOutboundAssignments(date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['outbound-assignments', 'driver', user?.email, date],
    queryFn: async () => {
      if (!user?.email) return [];

      // First get the user's internal ID from their email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (userError || !userData) return [];

      const { data, error } = await supabase
        .from('outbound_assignments')
        .select(`
          *,
          destination_entity:entities!destination_entity_id(
            id, legal_name, street_address, city, state, zip
          ),
          vehicle:vehicles(id, name),
          manifest:manifests(id, manifest_number, status)
        `)
        .eq('driver_id', userData.id)
        .eq('scheduled_date', date)
        .in('status', ['scheduled', 'in_progress'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as OutboundAssignmentWithRelations[];
    },
    enabled: !!user?.email && !!date,
  });
}

// Fetch all outbound assignments for dispatchers (org-wide)
export function useOutboundAssignmentsAdmin(filters?: {
  date?: string;
  driverId?: string;
  status?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['outbound-assignments', 'admin', filters],
    queryFn: async () => {
      if (!user?.currentOrganization?.id) return [];

      let query = supabase
        .from('outbound_assignments')
        .select(`
          *,
          destination_entity:entities!destination_entity_id(
            id, legal_name, street_address, city, state, zip
          ),
          driver:users!driver_id(id, first_name, last_name),
          vehicle:vehicles(id, name),
          manifest:manifests(id, manifest_number, status)
        `)
        .eq('organization_id', user.currentOrganization.id)
        .order('scheduled_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (filters?.date) {
        query = query.eq('scheduled_date', filters.date);
      }
      if (filters?.driverId) {
        query = query.eq('driver_id', filters.driverId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OutboundAssignmentWithRelations[];
    },
    enabled: !!user?.currentOrganization?.id,
  });
}

// Create a new outbound assignment
export function useCreateOutboundAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      destination_entity_id: string;
      driver_id: string;
      vehicle_id?: string;
      scheduled_date: string;
      material_form?: MaterialForm;
      estimated_quantity?: number;
      estimated_unit?: UnitBasis;
      notes?: string;
    }) => {
      if (!user?.currentOrganization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('outbound_assignments')
        .insert({
          organization_id: user.currentOrganization.id,
          destination_entity_id: input.destination_entity_id,
          driver_id: input.driver_id,
          vehicle_id: input.vehicle_id || null,
          scheduled_date: input.scheduled_date,
          material_form: input.material_form || null,
          estimated_quantity: input.estimated_quantity || null,
          estimated_unit: input.estimated_unit || null,
          notes: input.notes || null,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-assignments'] });
      toast({
        title: 'Outbound delivery scheduled',
        description: 'The delivery has been assigned to the driver.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to schedule delivery',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update outbound assignment status
export function useUpdateOutboundAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
      manifest_id?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.status) updates.status = input.status;
      if (input.manifest_id) updates.manifest_id = input.manifest_id;

      const { data, error } = await supabase
        .from('outbound_assignments')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-assignments'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update assignment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Start delivery (mark as in_progress)
export function useStartOutboundDelivery() {
  const updateAssignment = useUpdateOutboundAssignment();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      return updateAssignment.mutateAsync({
        id: assignmentId,
        status: 'in_progress',
      });
    },
  });
}

// Complete delivery (mark as completed and link manifest)
export function useCompleteOutboundDelivery() {
  const updateAssignment = useUpdateOutboundAssignment();

  return useMutation({
    mutationFn: async (input: { assignmentId: string; manifestId: string }) => {
      return updateAssignment.mutateAsync({
        id: input.assignmentId,
        status: 'completed',
        manifest_id: input.manifestId,
      });
    },
  });
}

// Cancel assignment
export function useCancelOutboundAssignment() {
  const updateAssignment = useUpdateOutboundAssignment();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      return updateAssignment.mutateAsync({
        id: assignmentId,
        status: 'cancelled',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Assignment cancelled',
        description: 'The outbound delivery has been cancelled.',
      });
    },
  });
}
