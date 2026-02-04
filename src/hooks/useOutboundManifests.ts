import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Manifest = Database['public']['Tables']['manifests']['Row'];
type MaterialForm = Database['public']['Enums']['material_form'];
type UnitBasis = Database['public']['Enums']['unit_basis'];

export interface OutboundManifestData {
  destination_entity_id: string;
  origin_entity_id: string;
  material_form: MaterialForm;
  quantity: number;
  unit_basis: UnitBasis;
  quantity_pte: number;
  notes?: string;
}

// Note: material_form, total_pte, driver_name, receiver_name, notes fields were added via migration
// The generated types may not reflect these yet, but they exist on the database table
export interface OutboundManifestWithRelations extends Manifest {
  destination_entity?: {
    id: string;
    legal_name: string;
    street_address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    eg_number?: string | null;
  } | null;
  origin_entity?: {
    id: string;
    legal_name: string;
    street_address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    eg_number?: string | null;
  } | null;
}

// Fetch outbound manifests for the current driver
export const useOutboundManifests = () => {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['outbound-manifests', organizationId, user?.id],
    queryFn: async (): Promise<OutboundManifestWithRelations[]> => {
      if (!organizationId) {
        throw new Error('No organization context');
      }

      // Get driver's internal user ID
      const { data: driverUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!driverUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('manifests')
        .select(`
          *,
          destination_entity:entities!manifests_destination_entity_id_fkey(
            id, legal_name, street_address, city, state, zip, eg_number
          ),
          origin_entity:entities!manifests_origin_entity_id_fkey(
            id, legal_name, street_address, city, state, zip, eg_number
          )
        `)
        .eq('organization_id', organizationId)
        .eq('direction', 'outbound')
        .eq('driver_id', driverUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching outbound manifests:', error);
        throw error;
      }

      return (data || []) as OutboundManifestWithRelations[];
    },
    enabled: !!organizationId && !!user?.id
  });
};

// Fetch a single outbound manifest by ID
export const useOutboundManifest = (manifestId: string | undefined) => {
  return useQuery({
    queryKey: ['outbound-manifest', manifestId],
    queryFn: async (): Promise<OutboundManifestWithRelations | null> => {
      if (!manifestId) return null;

      const { data, error } = await supabase
        .from('manifests')
        .select(`
          *,
          destination_entity:entities!manifests_destination_entity_id_fkey(
            id, legal_name, street_address, city, state, zip, eg_number
          ),
          origin_entity:entities!manifests_origin_entity_id_fkey(
            id, legal_name, street_address, city, state, zip, eg_number
          )
        `)
        .eq('id', manifestId)
        .eq('direction', 'outbound')
        .single();

      if (error) {
        console.error('Error fetching outbound manifest:', error);
        throw error;
      }

      return data as OutboundManifestWithRelations;
    },
    enabled: !!manifestId
  });
};

// Generate next outbound manifest number
const generateOutboundManifestNumber = async (organizationId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `OUT-${year}-`;

  // Get the last outbound manifest number for this year
  const { data } = await supabase
    .from('manifests')
    .select('manifest_number')
    .eq('organization_id', organizationId)
    .eq('direction', 'outbound')
    .like('manifest_number', `${prefix}%`)
    .order('manifest_number', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].manifest_number;
    const match = lastNumber.match(/OUT-\d{4}-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

// Create a new outbound manifest
export const useCreateOutboundManifest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: OutboundManifestData) => {
      const organizationId = user?.currentOrganization?.id;
      if (!organizationId) {
        throw new Error('No organization context');
      }

      // Get driver's internal user ID
      const { data: driverUser } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('auth_user_id', user?.id)
        .single();

      if (!driverUser) {
        throw new Error('Driver user not found');
      }

      const manifestNumber = await generateOutboundManifestNumber(organizationId);

      // For outbound manifests, client_id is null (we use origin_entity_id and destination_entity_id instead)
      const insertData = {
        organization_id: organizationId,
        manifest_number: manifestNumber,
        direction: 'outbound',
        destination_entity_id: data.destination_entity_id,
        origin_entity_id: data.origin_entity_id,
        material_form: data.material_form,
        driver_id: driverUser.id,
        driver_name: `${driverUser.first_name || ''} ${driverUser.last_name || ''}`.trim() || 'Driver',
        status: 'AWAITING_FINALIZATION',
        total_pte: data.quantity_pte,
        notes: data.notes || null
      };

      const { data: manifest, error } = await supabase
        .from('manifests')
        .insert(insertData as any) // Type cast needed until types regenerate
        .select()
        .single();

      if (error) {
        console.error('Error creating outbound manifest:', error);
        throw error;
      }

      return manifest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-manifests'] });
      toast({
        title: "Manifest Created",
        description: "Outbound manifest has been created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

// Update outbound manifest with signatures
export const useUpdateOutboundManifestSignatures = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      manifestId,
      generatorSigPath,
      haulerSigPath
    }: {
      manifestId: string;
      generatorSigPath: string;
      haulerSigPath: string;
    }) => {
      const timestamp = new Date().toISOString();

      const { data, error } = await supabase
        .from('manifests')
        .update({
          customer_signature_png_path: generatorSigPath,
          driver_signature_png_path: haulerSigPath,
          generator_signed_at: timestamp,
          hauler_signed_at: timestamp
        })
        .eq('id', manifestId)
        .select()
        .single();

      if (error) {
        console.error('Error updating manifest signatures:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-manifests'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-manifest'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

// Complete outbound manifest with receiver signature
export const useCompleteOutboundManifest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      manifestId,
      receiverSigPath,
      receiverName
    }: {
      manifestId: string;
      receiverSigPath: string;
      receiverName: string;
    }) => {
      const timestamp = new Date().toISOString();

      const { data, error } = await supabase
        .from('manifests')
        .update({
          receiver_sig_path: receiverSigPath,
          receiver_signed_at: timestamp,
          receiver_name: receiverName,
          status: 'COMPLETED'
        })
        .eq('id', manifestId)
        .select()
        .single();

      if (error) {
        console.error('Error completing outbound manifest:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-manifests'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-manifest'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast({
        title: "Delivery Completed",
        description: "Outbound manifest has been completed with receiver signature"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

// Fetch outbound manifests pending receiver signature
export const usePendingOutboundManifests = () => {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['pending-outbound-manifests', organizationId, user?.id],
    queryFn: async (): Promise<OutboundManifestWithRelations[]> => {
      if (!organizationId) {
        throw new Error('No organization context');
      }

      // Get driver's internal user ID
      const { data: driverUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!driverUser) {
        return [];
      }

      const { data, error } = await supabase
        .from('manifests')
        .select(`
          *,
          destination_entity:entities!manifests_destination_entity_id_fkey(
            id, legal_name, street_address, city, state, zip, eg_number
          ),
          origin_entity:entities!manifests_origin_entity_id_fkey(
            id, legal_name, street_address, city, state, zip, eg_number
          )
        `)
        .eq('organization_id', organizationId)
        .eq('direction', 'outbound')
        .eq('driver_id', driverUser.id)
        .not('hauler_signed_at', 'is', null)
        .is('receiver_signed_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending outbound manifests:', error);
        throw error;
      }

      return (data || []) as OutboundManifestWithRelations[];
    },
    enabled: !!organizationId && !!user?.id
  });
};
