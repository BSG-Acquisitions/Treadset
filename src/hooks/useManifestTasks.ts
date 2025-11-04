import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ManifestTask {
  id: string;
  manifest_id: string;
  organization_id: string;
  assigned_to?: string;
  assigned_role: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high';
  days_overdue: number;
  escalation_level: number;
  notes?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
  manifests?: {
    manifest_number: string;
    clients?: {
      company_name: string;
    };
  };
}

export const useManifestTasks = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['manifest-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manifest_tasks_beta')
        .select(`
          *,
          manifests(
            manifest_number,
            clients(company_name)
          )
        `)
        .in('status', ['pending', 'in_progress', 'escalated'])
        .order('priority', { ascending: false })
        .order('days_overdue', { ascending: false });

      if (error) throw error;
      return data as ManifestTask[];
    },
  });

  const openManifest = (manifestId: string) => {
    navigate(`/manifests`);
  };

  const resolveTask = useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!currentUser) throw new Error('User not found');

      // Get task details
      const { data: task } = await supabase
        .from('manifest_tasks_beta')
        .select('manifest_id, organization_id')
        .eq('id', taskId)
        .single();

      if (!task) throw new Error('Task not found');

      // Update task status
      const { error: updateError } = await supabase
        .from('manifest_tasks_beta')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: currentUser.id,
          notes,
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Record followup
      await supabase.from('manifest_followups_beta').insert({
        manifest_id: task.manifest_id,
        task_id: taskId,
        organization_id: task.organization_id,
        action_type: 'task_resolved',
        performed_by: currentUser.id,
        details: { notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifest-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-notifications'] });
      toast.success('Task marked as resolved');
    },
    onError: (error) => {
      console.error('Failed to resolve task:', error);
      toast.error('Failed to resolve task');
    },
  });

  const triggerAutomation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manifest-followup-automation');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manifest-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-notifications'] });
      toast.success(
        `Automation complete: ${data.summary.tasksCreated} created, ${data.summary.tasksEscalated} escalated`
      );
    },
    onError: (error) => {
      console.error('Failed to trigger automation:', error);
      toast.error('Failed to trigger automation');
    },
  });

  return {
    tasks: tasks || [],
    isLoading,
    openManifest,
    resolveTask: resolveTask.mutate,
    isResolving: resolveTask.isPending,
    triggerAutomation: triggerAutomation.mutate,
    isTriggeringAutomation: triggerAutomation.isPending,
  };
};
