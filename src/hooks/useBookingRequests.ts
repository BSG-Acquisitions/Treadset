import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BookingRequest {
  id: string;
  organization_id: string;
  client_id: string | null;
  zone_id: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;
  pickup_address: string;
  pickup_city: string | null;
  pickup_state: string | null;
  pickup_zip: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  requested_date: string;
  preferred_time_window: string | null;
  tire_estimate_pte: number;
  tire_estimate_otr: number;
  tire_estimate_tractor: number;
  estimated_value: number;
  notes: string | null;
  zone_matched: boolean;
  detour_distance_miles: number | null;
  route_efficiency_impact: number | null;
  status: 'pending' | 'approved' | 'modified' | 'declined' | 'cancelled';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  pickup_id: string | null;
  suggested_date: string | null;
  modification_reason: string | null;
  modification_confirmed: boolean;
  modification_confirmed_at: string | null;
  decline_reason: string | null;
  confirmation_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
  clients?: {
    company_name: string;
    contact_name: string | null;
    email: string | null;
  };
  service_zones?: {
    zone_name: string;
  };
}

export function useBookingRequests(status?: string) {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['booking-requests', organizationId, status],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('booking_requests')
        .select(`
          *,
          clients (
            company_name,
            contact_name,
            email
          ),
          service_zones (
            zone_name
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching booking requests:', error);
        throw error;
      }

      return data as BookingRequest[];
    },
    enabled: !!organizationId,
  });
}

export function usePendingBookingCount() {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['pending-booking-count', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;

      const { count, error } = await supabase
        .from('booking_requests')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching pending count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!organizationId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useProcessBookingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      bookingRequestId: string;
      action: 'approve' | 'modify' | 'decline';
      scheduledDate?: string;
      scheduledTimeWindow?: string;
      suggestedDate?: string;
      modificationReason?: string;
      declineReason?: string;
      adminNotes?: string;
      vehicleId?: string;
      driverId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('process-booking-request', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-booking-count'] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });

      const actionMessages = {
        approve: 'Booking approved and pickup scheduled',
        modify: 'Alternative date suggested to client',
        decline: 'Booking request declined',
      };
      toast.success(actionMessages[variables.action]);
    },
    onError: (error: Error) => {
      console.error('Error processing booking request:', error);
      toast.error(`Failed to process booking: ${error.message}`);
    },
  });
}

export function useDeleteBookingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingRequestId: string) => {
      const { error } = await supabase
        .from('booking_requests')
        .delete()
        .eq('id', bookingRequestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-booking-count'] });
      toast.success('Booking request deleted');
    },
    onError: (error: Error) => {
      console.error('Error deleting booking request:', error);
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
