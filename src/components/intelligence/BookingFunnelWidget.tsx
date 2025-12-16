import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Mail, MousePointer, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface FunnelStats {
  emailsSent: number;
  emailsClicked: number;
  bookingsStarted: number;
  bookingsCompleted: number;
  bookingsApproved: number;
  bookingsDeclined: number;
  conversionRate: number;
  approvalRate: number;
}

export function BookingFunnelWidget() {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['booking-funnel', organizationId],
    queryFn: async (): Promise<FunnelStats> => {
      if (!organizationId) throw new Error('No organization');

      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();

      // Get analytics events for this month
      const { data: events } = await supabase
        .from('booking_analytics')
        .select('event_type')
        .eq('organization_id', organizationId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);

      const counts = {
        email_sent: 0,
        email_clicked: 0,
        booking_started: 0,
        booking_completed: 0,
        booking_approved: 0,
        booking_declined: 0,
      };

      (events || []).forEach(e => {
        if (counts[e.event_type as keyof typeof counts] !== undefined) {
          counts[e.event_type as keyof typeof counts]++;
        }
      });

      const conversionRate = counts.email_sent > 0 
        ? (counts.booking_completed / counts.email_sent) * 100 
        : 0;

      const approvalRate = counts.booking_completed > 0
        ? (counts.booking_approved / counts.booking_completed) * 100
        : 0;

      return {
        emailsSent: counts.email_sent,
        emailsClicked: counts.email_clicked,
        bookingsStarted: counts.booking_started,
        bookingsCompleted: counts.booking_completed,
        bookingsApproved: counts.booking_approved,
        bookingsDeclined: counts.booking_declined,
        conversionRate,
        approvalRate,
      };
    },
    enabled: !!organizationId,
    refetchInterval: 60000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-brand-primary" />
          Booking Conversion Funnel
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'MMMM yyyy')} performance
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Funnel visualization */}
            <div className="space-y-2">
              <FunnelStep 
                icon={<Mail className="h-4 w-4" />}
                label="Outreach Emails Sent"
                value={stats?.emailsSent || 0}
                percentage={100}
              />
              <FunnelStep 
                icon={<MousePointer className="h-4 w-4" />}
                label="Emails Clicked"
                value={stats?.emailsClicked || 0}
                percentage={stats?.emailsSent ? (stats.emailsClicked / stats.emailsSent) * 100 : 0}
              />
              <FunnelStep 
                icon={<Calendar className="h-4 w-4" />}
                label="Bookings Completed"
                value={stats?.bookingsCompleted || 0}
                percentage={stats?.emailsSent ? (stats.bookingsCompleted / stats.emailsSent) * 100 : 0}
              />
              <FunnelStep 
                icon={<CheckCircle className="h-4 w-4 text-green-600" />}
                label="Approved"
                value={stats?.bookingsApproved || 0}
                percentage={stats?.bookingsCompleted ? (stats.bookingsApproved / stats.bookingsCompleted) * 100 : 0}
              />
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-2xl font-bold text-brand-primary">
                  {stats?.conversionRate.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-muted-foreground">Email → Booking Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.approvalRate.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-muted-foreground">Approval Rate</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FunnelStep({ 
  icon, 
  label, 
  value, 
  percentage 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  percentage: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm">{label}</span>
          <span className="text-sm font-medium">{value}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand-primary rounded-full transition-all"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
