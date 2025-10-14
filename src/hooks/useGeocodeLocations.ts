import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useGeocodeLocations() {
  const [isLoading, setIsLoading] = useState(false);

  const geocodeLocation = async (locationId: string, forceUpdate = false) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-locations', {
        body: { locationId, forceUpdate }
      });

      if (error) throw error;

      toast.success(data.message || 'Location geocoded successfully');
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
        body: {}
      });

      if (error) throw error;

      toast.success(data.message || 'Locations geocoded successfully');
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
