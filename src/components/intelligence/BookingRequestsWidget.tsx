import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Clock, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface BookingStats {
  pending: number;
  approvedToday: number;
  declinedToday: number;
  totalThisWeek: number;
}

export function BookingRequestsWidget() {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  const { data: stats, isLoading } = useQuery<BookingStats>({
    queryKey: ['booking-requests-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return { pending: 0, approvedToday: 0, declinedToday: 0, totalThisWeek: 0 };

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get pending count
      const { count: pendingCount } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending');

      // Get approved today
      const { count: approvedTodayCount } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .gte('reviewed_at', today);

      // Get declined today
      const { count: declinedTodayCount } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'declined')
        .gte('reviewed_at', today);

      // Get total this week
      const { count: weekTotal } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', weekAgo.toISOString());

      return {
        pending: pendingCount || 0,
        approvedToday: approvedTodayCount || 0,
        declinedToday: declinedTodayCount || 0,
        totalThisWeek: weekTotal || 0,
      };
    },
    enabled: !!organizationId,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarPlus className="h-5 w-5 text-brand-primary" />
          Self-Scheduled Bookings
          {stats?.pending && stats.pending > 0 && (
            <Badge variant="destructive" className="ml-auto animate-pulse">
              {stats.pending} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-amber-500/10">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-600" />
            <p className="text-2xl font-bold text-amber-700">{stats?.pending || 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/10">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{stats?.approvedToday || 0}</p>
            <p className="text-xs text-muted-foreground">Approved Today</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <CalendarPlus className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats?.totalThisWeek || 0}</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
        </div>

        <Link to="/booking-requests">
          <Button variant="outline" className="w-full" size="sm">
            View All Requests
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
