import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DataCompletenessStats {
  totalClients: number;
  clientsWithCoordinates: number;
  clientsNeedingGeocode: number; // Have location record + address, but no coordinates
  clientsMissingLocation: number; // No location record at all
  completionPercentage: number;
}

interface ClientMissingData {
  id: string;
  company_name: string;
  physical_address: string | null;
  physical_city: string | null;
  physical_zip: string | null;
  hasLocation: boolean;
  hasCoordinates: boolean;
  canGeocode: boolean;
}

export function useMapDataCompleteness() {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  const queryClient = useQueryClient();
  const [isFixing, setIsFixing] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['map-data-completeness', organizationId],
    queryFn: async (): Promise<DataCompletenessStats> => {
      if (!organizationId) throw new Error('No organization');

      // Get all active clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, company_name, physical_address, physical_city, physical_zip')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (clientsError) throw clientsError;

      // Get locations with coordinates
      const { data: locations, error: locError } = await supabase
        .from('locations')
        .select('client_id, latitude, longitude, address')
        .eq('organization_id', organizationId);

      if (locError) throw locError;

      const locationMap = new Map<string, { hasCoords: boolean; address: string | null }>();
      for (const loc of locations || []) {
        if (loc.client_id) {
          locationMap.set(loc.client_id, {
            hasCoords: loc.latitude !== null && loc.longitude !== null,
            address: loc.address
          });
        }
      }

      let withCoords = 0;
      let needsGeocode = 0;
      let missingLocation = 0;

      for (const client of clients || []) {
        const locData = locationMap.get(client.id);
        if (locData?.hasCoords) {
          withCoords++;
        } else if (locData) {
          // Has location but no coordinates
          needsGeocode++;
        } else {
          // No location record
          missingLocation++;
        }
      }

      const total = clients?.length || 0;
      return {
        totalClients: total,
        clientsWithCoordinates: withCoords,
        clientsNeedingGeocode: needsGeocode,
        clientsMissingLocation: missingLocation,
        completionPercentage: total > 0 ? Math.round((withCoords / total) * 100) : 0
      };
    },
    enabled: !!organizationId
  });

  const { data: missingClients } = useQuery({
    queryKey: ['missing-map-clients', organizationId],
    queryFn: async (): Promise<ClientMissingData[]> => {
      if (!organizationId) return [];

      const { data: clients } = await supabase
        .from('clients')
        .select('id, company_name, physical_address, physical_city, physical_zip')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      const { data: locations } = await supabase
        .from('locations')
        .select('client_id, latitude, longitude, address')
        .eq('organization_id', organizationId);

      const locationMap = new Map<string, { hasCoords: boolean; address: string | null }>();
      for (const loc of locations || []) {
        if (loc.client_id) {
          locationMap.set(loc.client_id, {
            hasCoords: loc.latitude !== null && loc.longitude !== null,
            address: loc.address
          });
        }
      }

      const missing: ClientMissingData[] = [];
      for (const client of clients || []) {
        const locData = locationMap.get(client.id);
        const hasLocation = !!locData;
        const hasCoords = locData?.hasCoords || false;
        
        if (!hasCoords) {
          const hasAddress = !!(client.physical_address || (client.physical_city && client.physical_zip));
          missing.push({
            id: client.id,
            company_name: client.company_name,
            physical_address: client.physical_address,
            physical_city: client.physical_city,
            physical_zip: client.physical_zip,
            hasLocation,
            hasCoordinates: false,
            canGeocode: hasAddress
          });
        }
      }

      return missing;
    },
    enabled: !!organizationId
  });

  const fixMissingData = async () => {
    if (!organizationId || !missingClients?.length) return;
    
    setIsFixing(true);
    let created = 0;
    let geocoded = 0;
    let failed = 0;

    try {
      // Step 1: Create location records for clients that don't have them
      const clientsNeedingLocations = missingClients.filter(c => !c.hasLocation && c.canGeocode);
      
      for (const client of clientsNeedingLocations) {
        const address = client.physical_address || 
          [client.physical_city, 'MI', client.physical_zip].filter(Boolean).join(', ');
        
        const { error } = await supabase
          .from('locations')
          .insert({
            client_id: client.id,
            organization_id: organizationId,
            name: client.company_name,
            address: address,
            is_primary: true
          });
        
        if (!error) created++;
      }

      // Step 2: Batch geocode all locations without coordinates
      const { data, error } = await supabase.functions.invoke('geocode-locations', {
        body: { fixOutliers: true }
      });

      if (error) {
        console.error('Geocoding error:', error);
        failed++;
      } else {
        geocoded = data?.processed || 0;
      }

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['map-data-completeness'] });
      queryClient.invalidateQueries({ queryKey: ['missing-map-clients'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['all-locations'] });

      toast.success(`Fixed map data: ${created} locations created, ${geocoded} geocoded`);
    } catch (err) {
      console.error('Fix missing data error:', err);
      toast.error('Failed to fix some map data');
    } finally {
      setIsFixing(false);
    }
  };

  const refreshMapData = async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['locations'] });
    queryClient.invalidateQueries({ queryKey: ['all-locations'] });
    toast.success('Map data refreshed');
  };

  return {
    stats: stats || {
      totalClients: 0,
      clientsWithCoordinates: 0,
      clientsNeedingGeocode: 0,
      clientsMissingLocation: 0,
      completionPercentage: 0
    },
    missingClients: missingClients || [],
    isLoading,
    isFixing,
    fixMissingData,
    refreshMapData,
    refetch
  };
}
