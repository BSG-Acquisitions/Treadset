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
          // Mark stale but don't immediately refetch
          queryClient.invalidateQueries({ queryKey: ['clients'], refetchType: 'none' });
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
          queryClient.invalidateQueries({ queryKey: ['pickups'], refetchType: 'none' });
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
          queryClient.invalidateQueries({ queryKey: ['vehicles'], refetchType: 'none' });
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
          queryClient.invalidateQueries({ queryKey: ['client-summaries'], refetchType: 'none' });
          queryClient.invalidateQueries({ queryKey: ['client-summary-analytics'], refetchType: 'none' });
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
          queryClient.invalidateQueries({ queryKey: ['assignments'], refetchType: 'none' });
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
          queryClient.invalidateQueries({ queryKey: ['manifests'], refetchType: 'none' });
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