import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function useGeocodeLocations() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const invalidateAllRouteQueries = () => {
    // Invalidate all route-related queries to trigger re-fetch with new coordinates
    queryClient.invalidateQueries({ queryKey: ['routes'] });
    queryClient.invalidateQueries({ queryKey: ['optimized-routes'] });
    queryClient.invalidateQueries({ queryKey: ['assignments'] });
    queryClient.invalidateQueries({ queryKey: ['locations'] });
    queryClient.invalidateQueries({ queryKey: ['all-locations'] });
    queryClient.invalidateQueries({ queryKey: ['pickups'] });
  };

  const geocodeLocation = async (locationId: string, forceUpdate = false) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-locations', {
        body: { locationId, forceUpdate }
      });

      if (error) throw error;

      toast.success(data.message || 'Location geocoded successfully');
      invalidateAllRouteQueries();
      return data;
    } catch (error: any) {
      console.error('Geocoding error:', error);
      toast.error(error.message || 'Failed to geocode location');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAllLocations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-locations', {
        body: { fixOutliers: true }
      });

      if (error) throw error;

      toast.success(data.message || 'Locations geocoded successfully');
      invalidateAllRouteQueries();
      return data;
    } catch (error: any) {
      console.error('Geocoding error:', error);
      toast.error(error.message || 'Failed to geocode locations');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    geocodeLocation,
    geocodeAllLocations,
    isLoading
  };
}
