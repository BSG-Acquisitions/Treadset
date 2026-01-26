import { DemoLayout } from '@/components/demo/DemoLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Truck, 
  Users, 
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { DEMO_DASHBOARD_METRICS, DEMO_PICKUPS } from '@/lib/demo';

export default function DemoDashboard() {
  const metrics = DEMO_DASHBOARD_METRICS;
  const pickups = DEMO_PICKUPS;
  
  const todayVsYesterday = ((metrics.todayPtes - metrics.yesterdayPtes) / metrics.yesterdayPtes * 100).toFixed(1);
  const isUp = parseFloat(todayVsYesterday) > 0;

  return (
    <DemoLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the TreadSet demo</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Today's PTEs"
            value={metrics.todayPtes.toLocaleString()}
            subtitle={`${isUp ? '+' : ''}${todayVsYesterday}% vs yesterday`}
            icon={<TrendingUp className="h-4 w-4" />}
            trend={isUp ? 'up' : 'down'}
          />
          <MetricCard
            title="This Week"
            value={metrics.weekPtes.toLocaleString()}
            subtitle="PTEs collected"
            icon={<Calendar className="h-4 w-4" />}
          />
          <MetricCard
            title="Active Clients"
            value={metrics.activeClients.toString()}
            subtitle="Total accounts"
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Monthly Revenue"
            value={`$${metrics.monthlyRevenue.toLocaleString()}`}
            subtitle="This month"
            icon={<DollarSign className="h-4 w-4" />}
          />
        </div>

        {/* Today's Routes */}
        <Card>
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Today's Routes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {pickups.map((pickup) => (
                <div key={pickup.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <StatusBadge status={pickup.status} />
                    <div>
                      <p className="font-medium text-foreground">{pickup.client.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {pickup.client.physical_city}, {pickup.client.physical_state} • {pickup.preferred_window}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{pickup.pte_count} PTEs</p>
                    {(pickup.otr_count > 0 || pickup.tractor_count > 0) && (
                      <p className="text-sm text-muted-foreground">
                        {pickup.otr_count > 0 && `${pickup.otr_count} OTR`}
                        {pickup.otr_count > 0 && pickup.tractor_count > 0 && ' • '}
                        {pickup.tractor_count > 0 && `${pickup.tractor_count} Tractor`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* YTD Summary */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Year-to-Date Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total PTEs</span>
                <span className="font-semibold">{metrics.ytdPtes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Revenue</span>
                <span className="font-semibold">${metrics.ytdRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Pickups</span>
                <span className="font-semibold">{metrics.monthPickups}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">This Month PTEs</span>
                <span className="font-semibold">{metrics.monthPtes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Week Pickups</span>
                <span className="font-semibold">{metrics.weekPickups}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Today's Pickups</span>
                <span className="font-semibold">{metrics.todayPickups}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DemoLayout>
  );
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  trend 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: React.ReactNode;
  trend?: 'up' | 'down';
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">{icon}</div>
          {trend && (
            trend === 'up' ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )
          )}
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
    completed: { variant: 'default', label: 'Completed' },
    in_progress: { variant: 'secondary', label: 'In Progress' },
    scheduled: { variant: 'outline', label: 'Scheduled' },
  };
  
  const config = variants[status] || variants.scheduled;
  
  return (
    <Badge variant={config.variant} className="w-24 justify-center">
      {config.label}
    </Badge>
  );
}
