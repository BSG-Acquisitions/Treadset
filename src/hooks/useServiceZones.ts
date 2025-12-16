import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ServiceZone {
  id: string;
  organization_id: string;
  zone_name: string;
  description: string | null;
  primary_service_days: string[];
  zip_codes: string[];
  center_lat: number | null;
  center_lng: number | null;
  max_detour_miles: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SuggestedZone {
  zone_name: string;
  zip_codes: string[];
  primary_service_days: string[];
  center_lat: number;
  center_lng: number;
  pickup_count: number;
}

export function useServiceZones() {
  const { organizationId } = useAuth();

  return useQuery({
    queryKey: ['service-zones', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('service_zones')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('zone_name');

      if (error) {
        console.error('Error fetching service zones:', error);
        throw error;
      }

      return data as ServiceZone[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateServiceZone() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (zone: Omit<ServiceZone, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
      if (!organizationId) throw new Error('No organization');

      const { data, error } = await supabase
        .from('service_zones')
        .insert({
          ...zone,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-zones'] });
      toast.success('Service zone created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create zone: ${error.message}`);
    },
  });
}

export function useUpdateServiceZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceZone> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-zones'] });
      toast.success('Service zone updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update zone: ${error.message}`);
    },
  });
}

export function useDeleteServiceZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_zones')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-zones'] });
      toast.success('Service zone removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove zone: ${error.message}`);
    },
  });
}

export function useAnalyzeServiceZones() {
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No organization');

      const { data, error } = await supabase.functions.invoke('analyze-service-zones', {
        body: { organizationId },
      });

      if (error) throw error;
      return data as {
        success: boolean;
        suggestedZones: SuggestedZone[];
        analyzedManifests: number;
        uniqueZipCodes: number;
      };
    },
    onError: (error: Error) => {
      toast.error(`Zone analysis failed: ${error.message}`);
    },
  });
}

export function useZoneForZipCode(zipCode: string | null) {
  const { organizationId } = useAuth();

  return useQuery({
    queryKey: ['zone-for-zip', organizationId, zipCode],
    queryFn: async () => {
      if (!organizationId || !zipCode) return null;

      const { data, error } = await supabase
        .from('service_zones')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .contains('zip_codes', [zipCode])
        .single();

      if (error) {
        // No zone found for this ZIP
        return null;
      }

      return data as ServiceZone;
    },
    enabled: !!organizationId && !!zipCode,
  });
}
