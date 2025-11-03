import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface DataQualityFlag {
  id: string;
  organization_id: string;
  record_type: 'client' | 'pickup' | 'manifest' | 'location';
  record_id: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  detected_at: string;
  resolved_at?: string;
  resolved_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useDataQualityFlags = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: flags, isLoading } = useQuery({
    queryKey: ['data-quality-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_quality_flags')
        .select('*')
        .is('resolved_at', null)
        .order('severity', { ascending: false })
        .order('detected_at', { ascending: false });

      if (error) throw error;
      return data as DataQualityFlag[];
    },
    enabled: !!user?.id,
  });

  const { data: resolvedFlags } = useQuery({
    queryKey: ['data-quality-flags-resolved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_quality_flags')
        .select('*')
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as DataQualityFlag[];
    },
    enabled: !!user?.id,
  });

  const markAsReviewed = useMutation({
    mutationFn: async ({ flagId, notes }: { flagId: string; notes?: string }) => {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      const { error } = await supabase
        .from('data_quality_flags')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: userData.id,
          notes: notes || null,
        })
        .eq('id', flagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-quality-flags'] });
      queryClient.invalidateQueries({ queryKey: ['data-quality-flags-resolved'] });
      toast.success('Issue marked as reviewed');
    },
    onError: (error) => {
      toast.error('Failed to mark issue as reviewed');
      console.error(error);
    },
  });

  const triggerScan = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('data-quality-scan');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['data-quality-flags'] });
      toast.success(`Scan complete: ${data.new_issues_flagged} new issues found`);
    },
    onError: (error) => {
      toast.error('Scan failed');
      console.error(error);
    },
  });

  const stats = {
    total: flags?.length || 0,
    high: flags?.filter(f => f.severity === 'high').length || 0,
    medium: flags?.filter(f => f.severity === 'medium').length || 0,
    low: flags?.filter(f => f.severity === 'low').length || 0,
    byType: {
      client: flags?.filter(f => f.record_type === 'client').length || 0,
      pickup: flags?.filter(f => f.record_type === 'pickup').length || 0,
      manifest: flags?.filter(f => f.record_type === 'manifest').length || 0,
      location: flags?.filter(f => f.record_type === 'location').length || 0,
    },
  };

  return {
    flags: flags || [],
    resolvedFlags: resolvedFlags || [],
    isLoading,
    stats,
    markAsReviewed: markAsReviewed.mutate,
    isMarkingReviewed: markAsReviewed.isPending,
    triggerScan: triggerScan.mutate,
    isScanning: triggerScan.isPending,
  };
};
