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
  // Use internal users.id (NOT session.user.id which is the auth UUID)
  // Edge functions store notifications using internal users.id from user_organization_roles
  const internalUserId = user?.id ?? null;

  // Auto-trigger notification checks once per 6 hours (persisted across page reloads)
  useEffect(() => {
    const THROTTLE_KEY = 'notification_checks_last_triggered';
    const THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours

    const triggerNotificationChecks = async () => {
      if (!user?.id || isQuietHours()) return;

      const orgId = user.currentOrganization?.id;
      if (!orgId) return;

      // Check localStorage throttle
      const lastTriggered = localStorage.getItem(THROTTLE_KEY);
      if (lastTriggered && Date.now() - parseInt(lastTriggered, 10) < THROTTLE_MS) {
        console.log('[Notifications] Skipping auto-trigger (throttled, last:', new Date(parseInt(lastTriggered, 10)).toLocaleTimeString(), ')');
        return;
      }

      localStorage.setItem(THROTTLE_KEY, Date.now().toString());
      console.log('[Notifications] Auto-triggering notification checks...');

      try {
        await supabase.functions.invoke('check-missing-pickups', {
          body: { organization_id: orgId }
        });
        await supabase.functions.invoke('check-manifest-reminders', {
          body: {}
        });
        await supabase.functions.invoke('check-trailer-alerts', {
          body: {}
        });
        await supabase.functions.invoke('check-manifest-health', {
          body: { organization_id: orgId }
        });
        console.log('[Notifications] Auto-trigger complete');
      } catch (error) {
        console.error('[Notifications] Auto-trigger error:', error);
      }
    };

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
