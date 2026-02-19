import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemUpdates } from './useSystemUpdates';
import { useEffect, useRef } from 'react';

export interface EnhancedNotification {
  id: string;
  user_id: string;
  organization_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'missing_pickup';
  priority?: 'low' | 'medium' | 'high';
  action_link?: string;
  role_visibility?: string[];
  related_type?: string;
  related_id?: string;
  metadata?: {
    client_id?: string;
    client_name?: string;
    frequency?: string;
    typical_day?: string;
    days_since_last_pickup?: number;
    confidence_score?: number;
    [key: string]: any;
  };
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

const isQuietHours = (): boolean => {
  const now = new Date();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = estTime.getHours();
  return hour >= 22 || hour < 6; // 10 PM to 6 AM EST
};

export const useEnhancedNotifications = () => {
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const { createUpdate } = useSystemUpdates();
  const triggeredRef = useRef(false);
  
  // Use internal users.id (NOT session.user.id which is the auth UUID)
  // Edge functions store notifications using internal users.id from user_organization_roles
  const internalUserId = user?.id ?? null;

  // Auto-trigger notification checks once per session
  useEffect(() => {
    const triggerNotificationChecks = async () => {
      if (!user?.id || triggeredRef.current || isQuietHours()) return;
      
      // Get user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('id, user_organization_roles(organization_id)')
        .eq('auth_user_id', user.id)
        .single();

      const orgId = userData?.user_organization_roles?.[0]?.organization_id;
      if (!orgId) return;

      triggeredRef.current = true;
      console.log('[Notifications] Auto-triggering notification checks...');

      try {
        // Trigger missing pickups check
        await supabase.functions.invoke('check-missing-pickups', {
          body: { organization_id: orgId }
        });

        // Trigger manifest reminders check
        await supabase.functions.invoke('check-manifest-reminders', {
          body: {}
        });

        // Trigger trailer alerts check (if trailer feature is enabled)
        await supabase.functions.invoke('check-trailer-alerts', {
          body: {}
        });

        // Trigger manifest health/compliance check
        await supabase.functions.invoke('check-manifest-health', {
          body: { organization_id: orgId }
        });

        console.log('[Notifications] Auto-trigger complete');
      } catch (error) {
        console.error('[Notifications] Auto-trigger error:', error);
      }
    };

    // Run after a short delay to not block initial render
    const timer = setTimeout(triggerNotificationChecks, 5000);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['enhanced-notifications', internalUserId],
    queryFn: async () => {
      if (!internalUserId) return [];

      // Query using internal users.id (NOT auth UUID)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', internalUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as EnhancedNotification[];
    },
    enabled: !!internalUserId,
    refetchInterval: 60000, // Refetch every minute
  });

  const createNotification = useMutation({
    mutationFn: async (notification: Omit<EnhancedNotification, 'id' | 'created_at' | 'updated_at' | 'is_read'>) => {
      // Check quiet hours for non-critical notifications
      if (notification.priority !== 'high' && isQuietHours()) {
        console.log('Notification queued during quiet hours:', notification.title);
        return null;
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Log to system_updates
      await createUpdate({
        module_name: `notification_${notification.type}`,
        status: 'live',
        notes: `Created notification: ${notification.title}`,
        impacted_tables: ['notifications'],
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-notifications'] });
    },
    onError: (error) => {
      console.error('Failed to create notification:', error);
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!internalUserId) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', internalUserId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-notifications'] });
    },
  });

  const deleteAllRead = useMutation({
    mutationFn: async () => {
      if (!internalUserId) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', internalUserId)
        .eq('is_read', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-notifications'] });
      toast.success('Cleared all read notifications');
    },
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  const readCount = notifications?.filter(n => n.is_read).length || 0;

  return {
    notifications: notifications || [],
    isLoading,
    unreadCount,
    readCount,
    createNotification: createNotification.mutate,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    isMarkingAllAsRead: markAllAsRead.isPending,
    deleteNotification: deleteNotification.mutate,
    deleteAllRead: deleteAllRead.mutate,
    isDeletingAllRead: deleteAllRead.isPending,
  };
};
