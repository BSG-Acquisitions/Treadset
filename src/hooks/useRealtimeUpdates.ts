import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up real-time subscription for clients
    const clientsChannel = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => {
          // Invalidate clients queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        }
      )
      .subscribe();

    // Set up real-time subscription for pickups
    const pickupsChannel = supabase
      .channel('pickups-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickups'
        },
        () => {
          // Invalidate pickups queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['pickups'] });
        }
      )
      .subscribe();

    // Set up real-time subscription for vehicles
    const vehiclesChannel = supabase
      .channel('vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        () => {
          // Invalidate vehicles queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        }
      )
      .subscribe();

    // Set up real-time subscription for assignments
    const assignmentsChannel = supabase
      .channel('assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments'
        },
        () => {
          // Invalidate assignments queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(pickupsChannel);
      supabase.removeChannel(vehiclesChannel);
      supabase.removeChannel(assignmentsChannel);
    };
  }, [queryClient]);
}