import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ManifestAlert {
  id: string;
  manifest_id: string;
  organization_id: string;
  alert_type: 'missing_signature' | 'incomplete_data' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  days_overdue: number;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useManifestAlerts = () => {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['manifest-alerts-beta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manifest_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ManifestAlert[];
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('manifest_alerts')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: userData?.id,
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifest-alerts-beta'] });
      toast.success('Alert resolved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve: ${error.message}`);
    },
  });

  return {
    alerts: alerts || [],
    isLoading,
    resolveAlert: resolveAlert.mutate,
  };
};
