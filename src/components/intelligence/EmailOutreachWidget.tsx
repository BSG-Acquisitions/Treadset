import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, MousePointerClick, CalendarCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailStats {
  sentThisMonth: number;
  clickRate: number;
  bookingsConverted: number;
  clientsReached: number;
}

export function EmailOutreachWidget() {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  const { data: stats, isLoading } = useQuery<EmailStats>({
    queryKey: ['email-outreach-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return { sentThisMonth: 0, clickRate: 0, bookingsConverted: 0, clientsReached: 0 };

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // Get email preferences with outreach data
      const { data: prefs, error } = await supabase
        .from('client_email_preferences')
        .select('outreach_count, emails_clicked, bookings_from_email, last_outreach_sent_at')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Error fetching email stats:', error);
        return { sentThisMonth: 0, clickRate: 0, bookingsConverted: 0, clientsReached: 0 };
      }

      // Calculate stats
      const sentThisMonth = prefs?.filter(p => 
        p.last_outreach_sent_at && new Date(p.last_outreach_sent_at) >= monthStart
      ).length || 0;

      const totalSent = prefs?.reduce((sum, p) => sum + (p.outreach_count || 0), 0) || 0;
      const totalClicks = prefs?.reduce((sum, p) => sum + (p.emails_clicked || 0), 0) || 0;
      const bookingsConverted = prefs?.reduce((sum, p) => sum + (p.bookings_from_email || 0), 0) || 0;

      const clickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0;
      const clientsReached = prefs?.filter(p => p.outreach_count && p.outreach_count > 0).length || 0;

      return {
        sentThisMonth,
        clickRate,
        bookingsConverted,
        clientsReached,
      };
    },
    enabled: !!organizationId,
    refetchInterval: 300000, // Refresh every 5 minutes
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
          <Mail className="h-5 w-5 text-brand-primary" />
          Automated Outreach
          <Badge variant="secondary" className="ml-auto text-xs">
            This Month
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <div className="flex items-center gap-2 mb-1">
              <Send className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Emails Sent</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats?.sentThisMonth || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10">
            <div className="flex items-center gap-2 mb-1">
              <MousePointerClick className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Click Rate</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{stats?.clickRate || 0}%</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Bookings</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats?.bookingsConverted || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Clients Reached</span>
            </div>
            <p className="text-2xl font-bold">{stats?.clientsReached || 0}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Automated emails are sent to overdue clients every 14 days
        </p>
      </CardContent>
    </Card>
  );
}
