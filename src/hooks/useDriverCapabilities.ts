import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DriverCapability {
  id: string;
  user_id: string;
  capability: string;
  granted_at: string;
  granted_by: string | null;
}

export const useDriverCapabilities = (userId?: string) => {
  return useQuery({
    queryKey: ['driver-capabilities', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('driver_capabilities')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as DriverCapability[];
    },
    enabled: !!userId,
  });
};

export const useCurrentUserCapabilities = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-user-capabilities', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get the internal user id first
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData) return [];
      
      const { data, error } = await supabase
        .from('driver_capabilities')
        .select('*')
        .eq('user_id', userData.id);
      
      if (error) throw error;
      return data as DriverCapability[];
    },
    enabled: !!user?.id,
  });
};

export const useHasSemiHaulerCapability = () => {
  const { data: capabilities, isLoading } = useCurrentUserCapabilities();
  
  const hasSemiHauler = capabilities?.some(c => c.capability === 'semi_hauler') ?? false;
  
  return { hasSemiHauler, isLoading };
};

export const useSemiHaulerDrivers = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['semi-hauler-drivers', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      // Get all users in the org who have semi_hauler capability
      const { data: capData, error } = await supabase
        .from('driver_capabilities')
        .select('user_id')
        .eq('capability', 'semi_hauler');
      
      if (error) throw error;
      if (!capData || capData.length === 0) return [];
      
      const userIds = capData.map(c => c.user_id);
      
      // Get user details
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      
      if (usersError) throw usersError;
      
      // Filter to only users in the current org
      const { data: orgUsers } = await supabase
        .from('user_organization_roles')
        .select('user_id')
        .eq('organization_id', orgId);
      
      const orgUserIds = new Set(orgUsers?.map(u => u.user_id) || []);
      
      return (users || []).filter(u => orgUserIds.has(u.id)) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
      }>;
    },
    enabled: !!orgId,
  });
};

export const useGrantCapability = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, capability }: { userId: string; capability: string }) => {
      // Get current user's internal id for granted_by
      const { data: grantor } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();
      
      const { error } = await supabase
        .from('driver_capabilities')
        .insert({
          user_id: userId,
          capability,
          granted_by: grantor?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-capabilities'] });
      queryClient.invalidateQueries({ queryKey: ['semi-hauler-drivers'] });
      toast.success('Capability granted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant capability: ${error.message}`);
    },
  });
};

export const useRevokeCapability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, capability }: { userId: string; capability: string }) => {
      const { error } = await supabase
        .from('driver_capabilities')
        .delete()
        .eq('user_id', userId)
        .eq('capability', capability);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-capabilities'] });
      queryClient.invalidateQueries({ queryKey: ['semi-hauler-drivers'] });
      toast.success('Capability revoked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke capability: ${error.message}`);
    },
  });
};
