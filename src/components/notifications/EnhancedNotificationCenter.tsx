import { useEnhancedNotifications, EnhancedNotification } from '@/hooks/useEnhancedNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  CheckCheck, 
  ExternalLink, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-800';
    case 'medium':
      return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-800';
    case 'low':
    default:
      return 'bg-blue-100 border-blue-300 dark:bg-blue-950 dark:border-blue-800';
  }
};

const getPriorityBadge = (priority?: string) => {
  const config = {
    high: { label: 'HIGH', variant: 'destructive' as const, icon: AlertCircle },
    medium: { label: 'MEDIUM', variant: 'default' as const, icon: Info },
    low: { label: 'LOW', variant: 'secondary' as const, icon: Info },
  };

  const { label, variant, icon: Icon } = config[priority as keyof typeof config] || config.low;

  return (
    <Badge variant={variant} className="flex items-center gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

interface NotificationItemProps {
  notification: EnhancedNotification;
  onMarkAsRead: (id: string) => void;
  onActionClick: (link: string) => void;
}

const NotificationItem = ({ notification, onMarkAsRead, onActionClick }: NotificationItemProps) => {
  return (
    <Card 
      className={`mb-2 cursor-pointer transition-all hover:shadow-md ${
        !notification.is_read ? getPriorityColor(notification.priority) : 'bg-card'
      }`}
      onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex-shrink-0">
            {getTypeIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className={`text-sm font-semibold ${
                notification.is_read ? 'text-muted-foreground' : 'text-foreground'
              }`}>
                {notification.title}
              </h4>
              {notification.priority && getPriorityBadge(notification.priority)}
            </div>
            
            <p className={`text-sm mb-2 ${
              notification.is_read ? 'text-muted-foreground' : 'text-foreground'
            }`}>
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
              
              {notification.action_link && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onActionClick(notification.action_link!);
                    onMarkAsRead(notification.id);
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  Quick Action
                </Button>
              )}
            </div>
          </div>
          
          {!notification.is_read && (
            <div className="w-2 h-2 rounded-full bg-brand-accent flex-shrink-0 mt-2" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const EnhancedNotificationCenter = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isMarkingAllAsRead } = useEnhancedNotifications();
  const navigate = useNavigate();

  const handleActionClick = (link: string) => {
    navigate(link);
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </div>
        
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllAsRead}
            className="gap-1"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="h-[500px]">
        <div className="p-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onActionClick={handleActionClick}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
