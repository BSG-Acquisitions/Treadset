import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

interface ClientsQueryParams {
  search?: string;
  type?: string;
  tags?: string[];
  sortBy?: 'updated_at' | 'lifetime_revenue' | 'company_name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const useClients = (params: ClientsQueryParams = {}) => {
  const { 
    search = '', 
    type, 
    tags = [], 
    sortBy = 'updated_at', 
    sortOrder = 'desc',
    page = 1,
    limit = 10
  } = params;

  return useQuery({
    queryKey: ['clients', search, type, tags, sortBy, sortOrder, page, limit],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select(`
          *,
          pricing_tier:pricing_tier_id(name, rate),
          locations(count)
        `, { count: 'exact' });

      // Search filter
      if (search) {
        query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      // Remove type filter since type column no longer exists

      // Tags filter
      if (tags.length > 0) {
        query = query.overlaps('tags', tags);
      }

      // Only active clients
      query = query.eq('is_active', true);

      // Sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      };
    }
  });
};

export const useClient = (id: string) => {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          pricing_tier:pricing_tier_id(name, rate),
          locations(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();

      if (error) throw error;

      // Auto-create location record and geocode for new clients with address
      if (data && (client.physical_address || (client.physical_city && client.physical_zip))) {
        try {
          const address = client.physical_address || 
            [client.physical_city, client.physical_state || 'MI', client.physical_zip].filter(Boolean).join(', ');
          
          // Create location record
          const { data: locData, error: locError } = await supabase
            .from('locations')
            .insert({
              client_id: data.id,
              organization_id: data.organization_id,
              name: data.company_name,
              address: address,
              is_primary: true
            })
            .select()
            .single();

          if (!locError && locData) {
            // Auto-geocode the new location
            console.log('Auto-geocoding new client location:', locData.id);
            await supabase.functions.invoke('geocode-locations', {
              body: { locationId: locData.id }
            });
            
            // Backfill geography
            await supabase.functions.invoke('backfill-client-geography', {
              body: { clientId: data.id }
            });
          }
        } catch (err) {
          console.warn('Auto-geocode for new client failed:', err);
        }
      }

      // Auto-send portal invite if client has email
      let portalInviteSent = false;
      if (data && client.email && client.email.trim()) {
        try {
          console.log('Auto-sending portal invite to new client:', data.company_name);
          const { error: inviteError } = await supabase.functions.invoke('send-portal-invitation', {
            body: { client_ids: [data.id] }
          });
          if (!inviteError) {
            portalInviteSent = true;
            console.log('Portal invite sent successfully to:', client.email);
          } else {
            console.warn('Portal invite failed:', inviteError);
          }
        } catch (err) {
          console.warn('Auto portal invite failed (non-critical):', err);
        }
      }

      return { ...data, portalInviteSent };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['all-locations'] });
      queryClient.invalidateQueries({ queryKey: ['map-data-completeness'] });
      queryClient.invalidateQueries({ queryKey: ['client-invites'] });
      toast({
        title: "Success",
        description: result.portalInviteSent 
          ? `Client created and portal invite sent to ${result.email}`
          : "Client created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ClientUpdate }) => {
      // Check if address-related fields changed
      const addressFieldsChanged = 
        updates.physical_address !== undefined ||
        updates.physical_city !== undefined ||
        updates.physical_state !== undefined ||
        updates.physical_zip !== undefined;

      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Auto-geocode location if address changed
      if (addressFieldsChanged && data) {
        try {
          // Find the client's primary location and trigger geocoding
          const { data: locations } = await supabase
            .from('locations')
            .select('id')
            .eq('client_id', id)
            .limit(1);

          if (locations && locations.length > 0) {
            console.log('Auto-geocoding location after client address update:', locations[0].id);
            await supabase.functions.invoke('geocode-locations', {
              body: { locationId: locations[0].id, forceUpdate: true }
            });
            
            // Also backfill client geography
            await supabase.functions.invoke('backfill-client-geography', {
              body: { clientId: id }
            });
          }
        } catch (err) {
          console.warn('Auto-geocode after client update failed:', err);
        }
      }

      return data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients-table'] });
      queryClient.invalidateQueries({ queryKey: ['client', updated.id] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['all-locations'] });
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, forceDelete = false }: { id: string; forceDelete?: boolean }) => {
      if (forceDelete) {
        // Force delete: cascade delete all related records in correct order
        
        // 1. Delete analytics/metadata tables first (no FK dependencies)
        await supabase.from('client_workflows').delete().eq('client_id', id);
        await supabase.from('client_summaries').delete().eq('client_id', id);
        await supabase.from('client_health_scores').delete().eq('client_id', id);
        await supabase.from('client_pickup_patterns').delete().eq('client_id', id);
        await supabase.from('client_risk_scores').delete().eq('client_id', id);
        await supabase.from('client_engagement').delete().eq('client_id', id);
        
        // 2. Nullify ALL foreign key references in manifests (pickup_id AND location_id)
        await supabase
          .from('manifests')
          .update({ pickup_id: null, location_id: null })
          .eq('client_id', id);
        
        // 3. Nullify pickup.manifest_id references before deleting pickups
        await supabase
          .from('pickups')
          .update({ manifest_id: null })
          .eq('client_id', id);
        
        // 4. Delete manifests FIRST (now safe - all FKs nullified)
        await supabase.from('manifests').delete().eq('client_id', id);
        
        // 5. Delete pickups (now safe - no manifest references)
        await supabase.from('pickups').delete().eq('client_id', id);
        
        // 6. Delete dropoffs
        await supabase.from('dropoffs').delete().eq('client_id', id);
        
        // 7. Delete locations (now safe - no manifest references)
        await supabase.from('locations').delete().eq('client_id', id);
        
        // 8. Finally delete the client
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { softDeleted: false, forceDeleted: true };
      }
      
      // Standard delete logic
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('open_balance')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (client.open_balance && client.open_balance > 0) {
        // Soft delete if open balance exists
        const { error } = await supabase
          .from('clients')
          .update({ is_active: false })
          .eq('id', id);

        if (error) throw error;
        return { softDeleted: true, forceDeleted: false };
      } else {
        // Hard delete if no open balance
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { softDeleted: false, forceDeleted: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients-table'] });
      toast({
        title: "Success",
        description: result.forceDeleted 
          ? "Client and all related records permanently deleted"
          : result.softDeleted 
            ? "Client deactivated due to open balance" 
            : "Client deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};