import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const NotificationTest = () => {
  const { createNotification } = useEnhancedNotifications();
  const { user } = useAuth();

  const testNotifications = [
    {
      title: 'High Priority Test',
      message: 'This is a high priority notification with quick action',
      type: 'warning' as const,
      priority: 'high' as const,
      action_link: '/clients',
    },
    {
      title: 'Medium Priority Test',
      message: 'This is a medium priority notification',
      type: 'info' as const,
      priority: 'medium' as const,
      action_link: '/routes/today',
    },
    {
      title: 'Low Priority Test',
      message: 'This is a low priority notification',
      type: 'success' as const,
      priority: 'low' as const,
    },
    {
      title: 'Incomplete Manifest Alert',
      message: 'Manifest #20250103-00001 for ACME Corp has been incomplete for 24+ hours',
      type: 'warning' as const,
      priority: 'medium' as const,
      action_link: '/manifests',
      related_type: 'manifest',
    },
    {
      title: 'Unassigned Pickup',
      message: 'Pickup for Widget Inc on 2025-01-05 needs driver assignment',
      type: 'error' as const,
      priority: 'high' as const,
      action_link: '/routes/today',
      related_type: 'pickup',
    },
  ];

  const sendTestNotification = async (index: number) => {
    const notif = testNotifications[index];
    
    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, organizations:user_organization_roles(organization_id)')
      .eq('auth_user_id', user?.id)
      .single();

    if (!userData) {
      toast.error('User data not found');
      return;
    }

    createNotification({
      user_id: userData.id,
      organization_id: userData.organizations[0]?.organization_id,
      ...notif,
      role_visibility: ['admin', 'ops_manager', 'dispatcher'],
    });

    toast.success('Test notification sent!');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification System Test</h1>
        <p className="text-muted-foreground">Test the enhanced notification center</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send Test Notifications</CardTitle>
          <CardDescription>
            Click any button to send a test notification. Check the bell icon in the nav to see them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {testNotifications.map((notif, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">{notif.title}</h4>
                <p className="text-sm text-muted-foreground">{notif.message}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-muted rounded">
                    Priority: {notif.priority}
                  </span>
                  <span className="text-xs px-2 py-1 bg-muted rounded">
                    Type: {notif.type}
                  </span>
                </div>
              </div>
              <Button onClick={() => sendTestNotification(index)}>
                Send
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ Priority-based color coding (High=Red, Medium=Yellow, Low=Blue)</li>
            <li>✓ Quick action buttons for contextual navigation</li>
            <li>✓ Quiet hours (10 PM - 6 AM EST) for non-critical alerts</li>
            <li>✓ Unread counter badge with pulse animation</li>
            <li>✓ Automatic contextual notifications for:
              <ul className="ml-6 mt-1">
                <li>• Incomplete manifests (24+ hours old)</li>
                <li>• Missing client data</li>
                <li>• Unassigned pickups (upcoming)</li>
              </ul>
            </li>
            <li>✓ All notifications logged to system_updates</li>
            <li>✓ Role-based visibility filtering</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationTest;
