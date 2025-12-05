import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TrailerRouteStatus } from "@/hooks/useTrailerRoutes";

export const useDeleteTrailerRoute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routeId: string) => {
      // First delete all events associated with stops on this route
      // Note: We don't have direct route_id on events, so we delete via the stops
      
      // Get all stops for this route
      const { data: stops } = await supabase
        .from('trailer_route_stops')
        .select('id')
        .eq('route_id', routeId);
      
      // Delete all stops
      const { error: stopsError } = await supabase
        .from('trailer_route_stops')
        .delete()
        .eq('route_id', routeId);
      
      if (stopsError) throw stopsError;
      
      // Delete the route
      const { error: routeError } = await supabase
        .from('trailer_routes')
        .delete()
        .eq('id', routeId);
      
      if (routeError) throw routeError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailer-routes'] });
      toast.success('Route deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete route: ${error.message}`);
    },
  });
};

export const useUpdateTrailerRouteStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ routeId, status }: { routeId: string; status: TrailerRouteStatus }) => {
      const { error } = await supabase
        .from('trailer_routes')
        .update({ status })
        .eq('id', routeId);
      
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['trailer-routes'] });
      
      const messages: Record<TrailerRouteStatus, string> = {
        draft: 'Route saved as draft',
        scheduled: 'Route scheduled',
        in_progress: 'Route marked as in progress',
        completed: 'Route completed',
        cancelled: 'Route cancelled',
      };
      
      toast.success(messages[status]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update route status: ${error.message}`);
    },
  });
};

export const useCancelTrailerRoute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routeId: string) => {
      const { error } = await supabase
        .from('trailer_routes')
        .update({ status: 'cancelled' })
        .eq('id', routeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailer-routes'] });
      toast.success('Route cancelled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel route: ${error.message}`);
    },
  });
};
