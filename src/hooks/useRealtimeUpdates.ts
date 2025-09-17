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

    // Set up real-time subscription for client summaries
    const summariesChannel = supabase
      .channel('client-summaries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_summaries'
        },
        () => {
          // Invalidate client summaries queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['client-summaries'] });
          queryClient.invalidateQueries({ queryKey: ['client-summary-analytics'] });
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

    // Set up real-time subscription for manifests
    const manifestsChannel = supabase
      .channel('manifests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'manifests'
        },
        () => {
          // Invalidate manifests queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['manifests'] });
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(pickupsChannel);
      supabase.removeChannel(vehiclesChannel);
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(summariesChannel);
      supabase.removeChannel(manifestsChannel);
    };
  }, [queryClient]);
}