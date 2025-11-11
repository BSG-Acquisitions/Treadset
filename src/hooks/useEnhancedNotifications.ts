import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemUpdates } from './useSystemUpdates';

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
  const { user } = useAuth();
  const { createUpdate } = useSystemUpdates();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['enhanced-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as EnhancedNotification[];
    },
    enabled: !!user?.id,
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
      if (!user?.id) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userData.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return {
    notifications: notifications || [],
    isLoading,
    unreadCount,
    createNotification: createNotification.mutate,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    isMarkingAllAsRead: markAllAsRead.isPending,
  };
};
