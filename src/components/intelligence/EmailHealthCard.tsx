import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  MousePointerClick, 
  Eye,
  XCircle,
  TrendingUp 
} from "lucide-react";
import { format, subDays } from "date-fns";

interface EmailHealthStats {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  lastSentAt: string | null;
  lastSentType: string | null;
}

export function EmailHealthCard() {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  const { data: stats, isLoading } = useQuery<EmailHealthStats>({
    queryKey: ['email-health-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          totalSent: 0, delivered: 0, opened: 0, clicked: 0,
          bounced: 0, complained: 0, deliveryRate: 0, openRate: 0,
          clickRate: 0, lastSentAt: null, lastSentType: null
        };
      }

      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      // Get email events from the last 7 days (use event_type column)
      const { data: events, error } = await supabase
        .from('email_events')
        .select('event_type, created_at, metadata')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching email events:', error);
        return {
          totalSent: 0, delivered: 0, opened: 0, clicked: 0,
          bounced: 0, complained: 0, deliveryRate: 0, openRate: 0,
          clickRate: 0, lastSentAt: null, lastSentType: null
        };
      }

      // Count events by type
      const counts = {
        sent: 0,
        delivered: 0,
        open: 0,
        click: 0,
        bounce: 0,
        complaint: 0,
        diagnostic: 0,
      };

      for (const event of events || []) {
        const eventType = event.event_type as keyof typeof counts;
        if (eventType in counts) {
          counts[eventType]++;
        }
      }

      // Also count from client_email_preferences for outreach stats
      const { data: prefs } = await supabase
        .from('client_email_preferences')
        .select('outreach_count, emails_clicked, last_outreach_sent_at')
        .eq('organization_id', organizationId);

      const totalOutreachSent = prefs?.reduce((sum, p) => sum + (p.outreach_count || 0), 0) || 0;
      const totalClicks = prefs?.reduce((sum, p) => sum + (p.emails_clicked || 0), 0) || 0;

      // Get the most recent email sent
      const lastOutreach = prefs
        ?.filter(p => p.last_outreach_sent_at)
        .sort((a, b) => new Date(b.last_outreach_sent_at!).getTime() - new Date(a.last_outreach_sent_at!).getTime())[0];

      // Get last sent from client_invites too (use created_at as send time)
      const { data: lastInvite } = await supabase
        .from('client_invites')
        .select('created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Determine the most recent send
      let lastSentAt: string | null = null;
      let lastSentType: string | null = null;

      if (lastOutreach?.last_outreach_sent_at && lastInvite?.created_at) {
        if (new Date(lastOutreach.last_outreach_sent_at) > new Date(lastInvite.created_at)) {
          lastSentAt = lastOutreach.last_outreach_sent_at;
          lastSentType = 'Outreach Email';
        } else {
          lastSentAt = lastInvite.created_at;
          lastSentType = 'Portal Invite';
        }
      } else if (lastOutreach?.last_outreach_sent_at) {
        lastSentAt = lastOutreach.last_outreach_sent_at;
        lastSentType = 'Outreach Email';
      } else if (lastInvite?.created_at) {
        lastSentAt = lastInvite.created_at;
        lastSentType = 'Portal Invite';
      }

      // Calculate combined stats
      const totalSent = counts.sent + counts.delivered + totalOutreachSent;
      const delivered = counts.delivered + totalOutreachSent; // Assume outreach delivered if no bounce
      const opened = counts.open;
      const clicked = counts.click + totalClicks;
      const bounced = counts.bounce;
      const complained = counts.complaint;

      const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 100;
      const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
      const clickRate = delivered > 0 ? Math.round((clicked / delivered) * 100) : 0;

      return {
        totalSent,
        delivered,
        opened,
        clicked,
        bounced,
        complained,
        deliveryRate,
        openRate,
        clickRate,
        lastSentAt,
        lastSentType,
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
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getHealthStatus = () => {
    if (!stats || stats.totalSent === 0) return { label: 'No Data', color: 'secondary' };
    if (stats.bounced > 0 || stats.complained > 0) return { label: 'Issues Detected', color: 'destructive' };
    if (stats.deliveryRate >= 95) return { label: 'Healthy', color: 'default' };
    if (stats.deliveryRate >= 80) return { label: 'Fair', color: 'secondary' };
    return { label: 'Needs Attention', color: 'destructive' };
  };

  const healthStatus = getHealthStatus();

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-brand-primary" />
          Email Health
          <Badge 
            variant={healthStatus.color as "default" | "secondary" | "destructive"} 
            className="ml-auto text-xs"
          >
            {healthStatus.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-brand-primary/10 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="h-4 w-4 text-brand-primary" />
            </div>
            <p className="text-2xl font-bold text-brand-primary">{stats?.deliveryRate || 0}%</p>
            <span className="text-xs text-muted-foreground">Delivery Rate</span>
          </div>
          <div className="p-3 rounded-lg bg-brand-accent/10 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Eye className="h-4 w-4 text-brand-accent" />
            </div>
            <p className="text-2xl font-bold text-brand-accent">{stats?.openRate || 0}%</p>
            <span className="text-xs text-muted-foreground">Open Rate</span>
          </div>
          <div className="p-3 rounded-lg bg-secondary text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MousePointerClick className="h-4 w-4 text-secondary-foreground" />
            </div>
            <p className="text-2xl font-bold text-secondary-foreground">{stats?.clickRate || 0}%</p>
            <span className="text-xs text-muted-foreground">Click Rate</span>
          </div>
        </div>

        {/* Volume & Issues Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sent (7d):</span>
              <span className="font-medium">{stats?.totalSent || 0}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {(stats?.bounced || 0) > 0 && (
              <div className="flex items-center gap-1.5 text-destructive">
                <XCircle className="h-4 w-4" />
                <span>{stats?.bounced} bounced</span>
              </div>
            )}
            {(stats?.complained || 0) > 0 && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>{stats?.complained} complaints</span>
              </div>
            )}
            {(stats?.bounced || 0) === 0 && (stats?.complained || 0) === 0 && (
              <span className="text-brand-primary text-xs flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                No issues
              </span>
            )}
          </div>
        </div>

        {/* Last Sent */}
        {stats?.lastSentAt && (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last email: {stats.lastSentType} • {format(new Date(stats.lastSentAt), 'MMM d, h:mm a')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
