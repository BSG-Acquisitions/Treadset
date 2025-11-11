import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PickupPattern {
  id: string;
  organization_id: string;
  client_id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'irregular';
  confidence_score: number;
  typical_day_of_week: number | null;
  typical_week_of_month: number | null;
  last_pickup_date: string;
  average_days_between_pickups: number;
  total_pickups_analyzed: number;
  last_analyzed_at: string;
  created_at: string;
  updated_at: string;
}

export const usePickupPatterns = () => {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['pickup-patterns', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID required');

      const { data, error } = await supabase
        .from('client_pickup_patterns')
        .select(`
          *,
          client:clients(id, company_name)
        `)
        .eq('organization_id', organizationId)
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      return data as (PickupPattern & { client: { id: string; company_name: string } })[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAnalyzePickupPatterns = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Organization ID required');

      toast.info('Analyzing pickup patterns...', {
        description: 'This may take a moment for large datasets',
      });

      const { data, error } = await supabase.functions.invoke('analyze-pickup-patterns', {
        body: { organization_id: organizationId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pickup-patterns'] });
      toast.success('Pattern analysis complete', {
        description: `Found ${data.patterns_found} regular pickup patterns from ${data.clients_analyzed} clients`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to analyze patterns', {
        description: error.message,
      });
    },
  });
};

export const useCheckMissingPickups = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Organization ID required');

      toast.info('Checking for missing pickups...');

      const { data, error } = await supabase.functions.invoke('check-missing-pickups', {
        body: { organization_id: organizationId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (data.notifications_created > 0) {
        toast.success('Found clients needing pickup', {
          description: `Created ${data.notifications_created} notifications for clients with regular schedules`,
        });
      } else {
        toast.success('All regular clients are scheduled', {
          description: 'No missing pickups detected',
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to check missing pickups', {
        description: error.message,
      });
    },
  });
};
