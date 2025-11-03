import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedNotifications } from './useEnhancedNotifications';
import { useSystemUpdates } from './useSystemUpdates';
import { toast } from 'sonner';

interface IncompleteManifest {
  id: string;
  manifest_number: string;
  client_id: string;
  organization_id: string;
  status: string;
  created_at: string;
  signed_at?: string;
  customer_sig_path?: string;
  receiver_sig_path?: string;
  clients?: {
    company_name: string;
  };
}

const getDaysSinceCreation = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const useManifestReminders = () => {
  const queryClient = useQueryClient();
  const { createNotification } = useEnhancedNotifications();
  const { createUpdate } = useSystemUpdates();

  // Check for incomplete manifests
  const { data: incompleteManifests, isLoading } = useQuery({
    queryKey: ['incomplete-manifests-reminders'],
    queryFn: async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const { data, error } = await supabase
        .from('manifests')
        .select(`
          id,
          manifest_number,
          client_id,
          status,
          created_at,
          signed_at,
          customer_sig_path,
          receiver_sig_path,
          organization_id,
          clients(company_name)
        `)
        .or('status.eq.DRAFT,customer_sig_path.is.null,receiver_sig_path.is.null')
        .lt('created_at', twoDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as IncompleteManifest[];
    },
    refetchInterval: 1000 * 60 * 60, // Check every hour
  });

  // Process reminders and create notifications
  const processReminders = useMutation({
    mutationFn: async () => {
      if (!incompleteManifests || incompleteManifests.length === 0) return;

      const notifications = [];

      for (const manifest of incompleteManifests) {
        const daysSince = getDaysSinceCreation(manifest.created_at);
        
        // Skip if less than 2 days
        if (daysSince < 2) continue;

        // Determine priority based on age
        let priority: 'low' | 'medium' | 'high' = 'medium';
        if (daysSince >= 3) priority = 'high';

        // Determine what's incomplete
        const issues = [];
        if (manifest.status === 'DRAFT') issues.push('incomplete');
        if (!manifest.customer_sig_path) issues.push('missing customer signature');
        if (!manifest.receiver_sig_path) issues.push('missing receiver signature');

        // Get all admin and receptionist users for this org
        const { data: orgUsers } = await supabase
          .from('user_organization_roles')
          .select('user_id, role, users(id, auth_user_id)')
          .eq('organization_id', manifest.organization_id)
          .in('role', ['admin', 'receptionist']);

        if (!orgUsers || orgUsers.length === 0) continue;

        // Create notifications for each admin/receptionist
        for (const orgUser of orgUsers) {
          if (!orgUser.users) continue;

          notifications.push({
            user_id: orgUser.user_id,
            organization_id: manifest.organization_id,
            title: `Manifest Needs Attention (Day ${daysSince})`,
            message: `Manifest ${manifest.manifest_number} for ${manifest.clients?.company_name} is ${issues.join(', ')}`,
            type: priority === 'high' ? 'error' : 'warning',
            priority,
            action_link: `/manifests`,
            role_visibility: ['admin', 'receptionist'],
            related_type: 'manifest',
            related_id: manifest.id,
          });
        }

        // Log to system_updates
        createUpdate({
          module_name: 'manifest_reminder',
          status: 'live',
          notes: `Reminder sent for manifest ${manifest.manifest_number} (Day ${daysSince}, Priority: ${priority})`,
          impacted_tables: ['manifests', 'notifications'],
        });

        // Day 7 escalation - create task (placeholder for future task module)
        if (daysSince >= 7) {
          console.log(`Day 7 escalation for manifest ${manifest.manifest_number} - Task creation would go here`);
        }
      }

      // Batch create notifications
      if (notifications.length > 0) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) throw notifError;
      }

      return { notificationsCreated: notifications.length };
    },
    onSuccess: (result) => {
      if (result && result.notificationsCreated > 0) {
        queryClient.invalidateQueries({ queryKey: ['enhanced-notifications'] });
        toast.success(`Processed ${result.notificationsCreated} manifest reminders`);
      }
    },
    onError: (error) => {
      console.error('Failed to process manifest reminders:', error);
      toast.error('Failed to process manifest reminders');
    },
  });

  const markManifestComplete = useMutation({
    mutationFn: async (manifestId: string) => {
      const { error } = await supabase
        .from('manifests')
        .update({ 
          status: 'COMPLETED',
          signed_at: new Date().toISOString(),
        })
        .eq('id', manifestId);

      if (error) throw error;

      // Log to system_updates
      await createUpdate({
        module_name: 'manifest_quick_complete',
        status: 'live',
        notes: `Manifest ${manifestId} marked complete via quick action`,
        impacted_tables: ['manifests'],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomplete-manifests-reminders'] });
      toast.success('Manifest marked as complete');
    },
    onError: (error) => {
      toast.error('Failed to mark manifest as complete');
      console.error(error);
    },
  });

  const assignFollowUp = useMutation({
    mutationFn: async ({ manifestId, userId }: { manifestId: string; userId: string }) => {
      // Create a follow-up notification
      const { data: manifest } = await supabase
        .from('manifests')
        .select('manifest_number, organization_id, clients(company_name)')
        .eq('id', manifestId)
        .single();

      if (!manifest) throw new Error('Manifest not found');

      await createNotification({
        user_id: userId,
        organization_id: manifest.organization_id,
        title: 'Follow-Up Assigned',
        message: `You've been assigned to follow up on manifest ${manifest.manifest_number}`,
        type: 'info',
        priority: 'medium',
        action_link: `/manifests`,
        related_type: 'manifest',
        related_id: manifestId,
      });

      // Log to system_updates
      await createUpdate({
        module_name: 'manifest_follow_up',
        status: 'live',
        notes: `Follow-up assigned for manifest ${manifestId}`,
        impacted_tables: ['manifests', 'notifications'],
      });
    },
    onSuccess: () => {
      toast.success('Follow-up assigned');
    },
    onError: (error) => {
      toast.error('Failed to assign follow-up');
      console.error(error);
    },
  });

  return {
    incompleteManifests: incompleteManifests || [],
    isLoading,
    processReminders: processReminders.mutate,
    isProcessing: processReminders.isPending,
    markManifestComplete: markManifestComplete.mutate,
    assignFollowUp: assignFollowUp.mutate,
  };
};
