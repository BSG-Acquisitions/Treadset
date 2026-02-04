import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Entity = Database['public']['Tables']['entities']['Row'];
type EntityInsert = Database['public']['Tables']['entities']['Insert'];
type EntityUpdate = Database['public']['Tables']['entities']['Update'];
type EntityKind = Database['public']['Enums']['entity_kind'];

export interface EntityFormData {
  legal_name: string;
  dba?: string | null;
  kind: EntityKind;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  county?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  eg_number?: string | null;
  is_active?: boolean;
}

// Fetch all entities with optional kind filter
export const useEntities = (kind?: EntityKind | EntityKind[]) => {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  
  return useQuery({
    queryKey: ['entities', kind, organizationId],
    queryFn: async (): Promise<Entity[]> => {
      if (!organizationId) {
        throw new Error('No organization context');
      }

      let query = supabase
        .from('entities')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('legal_name');

      if (kind) {
        if (Array.isArray(kind)) {
          query = query.in('kind', kind);
        } else {
          query = query.eq('kind', kind);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching entities:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!organizationId
  });
};

// Fetch destination entities (processors, end_users)
export const useDestinationEntities = () => {
  return useEntities(['processor', 'end_user']);
};

// Fetch a single entity by ID
export const useEntity = (id: string | null) => {
  return useQuery({
    queryKey: ['entity', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching entity:', error);
        throw error;
      }

      return data;
    },
    enabled: !!id
  });
};

// Create a new entity
export const useCreateEntity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: EntityFormData) => {
      const organizationId = user?.currentOrganization?.id;
      if (!organizationId) {
        throw new Error('No organization context');
      }

      const insertData: EntityInsert = {
        ...data,
        organization_id: organizationId,
        is_active: data.is_active ?? true
      };

      const { data: entity, error } = await supabase
        .from('entities')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating entity:', error);
        throw error;
      }

      return entity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast({
        title: "Entity Created",
        description: "New destination/processor has been added"
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

// Update an existing entity
export const useUpdateEntity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EntityUpdate }) => {
      const { data: entity, error } = await supabase
        .from('entities')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating entity:', error);
        throw error;
      }

      return entity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast({
        title: "Entity Updated",
        description: "Entity has been updated successfully"
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

// Deactivate an entity (soft delete)
export const useDeactivateEntity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('entities')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deactivating entity:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast({
        title: "Entity Deactivated",
        description: "Entity has been deactivated"
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

// Get the organization's own entity (for use as origin)
export const useOwnEntity = () => {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  
  return useQuery({
    queryKey: ['own-entity', organizationId],
    queryFn: async (): Promise<Entity | null> => {
      if (!organizationId) {
        return null;
      }

      // Try to find the processor entity for this organization
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('kind', 'processor')
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.error('Error fetching own entity:', error);
        throw error;
      }

      return data?.[0] || null;
    },
    enabled: !!organizationId
  });
};
