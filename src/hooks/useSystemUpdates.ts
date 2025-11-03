import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SystemUpdate {
  id: string;
  module_name: string;
  status: 'sandboxed' | 'verified' | 'live' | 'failed';
  timestamp: string;
  notes?: string;
  impacted_tables?: string[];
  test_results?: any;
  deployed_by?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export const useSystemUpdates = () => {
  const queryClient = useQueryClient();

  const { data: updates, isLoading } = useQuery({
    queryKey: ['system-updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SystemUpdate[];
    },
  });

  const createUpdate = useMutation({
    mutationFn: async (update: Partial<SystemUpdate>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      const { data: orgData } = await supabase
        .from('user_organization_roles')
        .select('organization_id')
        .eq('user_id', userData?.id)
        .single();

      const { data, error } = await supabase
        .from('system_updates')
        .insert([{
          module_name: update.module_name || '',
          status: update.status || 'sandboxed',
          notes: update.notes,
          impacted_tables: update.impacted_tables,
          test_results: update.test_results,
          deployed_by: userData?.id,
          organization_id: orgData?.organization_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-updates'] });
      toast.success('Module update logged');
    },
    onError: (error) => {
      toast.error(`Failed to log update: ${error.message}`);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: SystemUpdate['status']; notes?: string }) => {
      const { data, error } = await supabase
        .from('system_updates')
        .update({ status, notes })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-updates'] });
      toast.success('Module status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  return {
    updates: updates || [],
    isLoading,
    createUpdate: createUpdate.mutate,
    updateStatus: updateStatus.mutate,
  };
};
