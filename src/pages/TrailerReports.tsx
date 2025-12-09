import { useState } from "react";
import { 
  useTrailerUtilization, 
  useTrailerEventSummary, 
  useTrailerAlertsSummary,
  useActiveTrailerAlerts 
} from "@/hooks/useTrailerReports";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  Truck, Activity, AlertTriangle, Clock, Package, PackageOpen, 
  ArrowDownToLine, TrendingUp, MapPin, CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  empty: '#22c55e',
  full: '#ef4444',
  staged: '#3b82f6',
  in_transit: '#eab308',
  waiting_unload: '#f97316',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  pickup_empty: 'Pick Up Empty',
  drop_empty: 'Drop Off Empty',
  pickup_full: 'Pick Up Full',
  drop_full: 'Drop Off Full',
  swap: 'Swap',
  stage_empty: 'Stage Empty',
  external_pickup: 'External Pickup',
  external_drop: 'External Drop',
  waiting_unload: 'Waiting to Unload',
};

export default function TrailerReports() {
  if (!FEATURE_FLAGS.TRAILERS) return null;

  const [dateRange, setDateRange] = useState<'week' | 'month' | '30days'>('month');
  
  const { data: utilization, isLoading: loadingUtil } = useTrailerUtilization();
  const { data: eventSummary, isLoading: loadingEvents } = useTrailerEventSummary(dateRange);
  const { data: alertsSummary, isLoading: loadingAlerts } = useTrailerAlertsSummary();
  const { data: activeAlerts } = useActiveTrailerAlerts();

  const isLoading = loadingUtil || loadingEvents || loadingAlerts;

  // Prepare chart data
  const statusChartData = utilization ? [
    { name: 'Empty', value: utilization.statusBreakdown.empty, color: STATUS_COLORS.empty },
    { name: 'Full', value: utilization.statusBreakdown.full, color: STATUS_COLORS.full },
    { name: 'Staged', value: utilization.statusBreakdown.staged, color: STATUS_COLORS.staged },
    { name: 'In Transit', value: utilization.statusBreakdown.in_transit, color: STATUS_COLORS.in_transit },
    { name: 'Waiting', value: utilization.statusBreakdown.waiting_unload, color: STATUS_COLORS.waiting_unload },
  ].filter(d => d.value > 0) : [];

  const eventTypeChartData = eventSummary 
    ? Object.entries(eventSummary.eventsByType).map(([type, count]) => ({
        name: EVENT_TYPE_LABELS[type] || type,
        count,
      }))
    : [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Trailer Reports</h1>
        <p className="text-muted-foreground">Analytics and utilization metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Trailers</p>
                <p className="text-3xl font-bold">{utilization?.activeTrailers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Utilization Rate</p>
                <p className="text-3xl font-bold">{utilization?.utilizationRate || 0}%</p>
              </div>
            </div>
            <Progress value={utilization?.utilizationRate || 0} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Events This Period</p>
                <p className="text-3xl font-bold">{eventSummary?.totalEvents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-orange-500/20",
          (alertsSummary?.active || 0) > 0 ? "bg-orange-500/5" : "bg-green-500/5"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-lg",
                (alertsSummary?.active || 0) > 0 ? "bg-orange-500/10" : "bg-green-500/10"
              )}>
                {(alertsSummary?.active || 0) > 0 ? (
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-3xl font-bold">{alertsSummary?.active || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different report views */}
      <Tabs defaultValue="utilization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="utilization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Distribution</CardTitle>
                <CardDescription>Current trailer status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Status Summary Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Summary</CardTitle>
                <CardDescription>Detailed breakdown by status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { status: 'empty', label: 'Empty', icon: PackageOpen, color: 'text-green-600 bg-green-500/10' },
                  { status: 'full', label: 'Full', icon: Package, color: 'text-red-600 bg-red-500/10' },
                  { status: 'staged', label: 'Staged', icon: ArrowDownToLine, color: 'text-blue-600 bg-blue-500/10' },
                  { status: 'in_transit', label: 'In Transit', icon: Truck, color: 'text-yellow-600 bg-yellow-500/10' },
                  { status: 'waiting_unload', label: 'Waiting to Unload', icon: Clock, color: 'text-orange-600 bg-orange-500/10' },
                ].map(({ status, label, icon: Icon, color }) => {
                  const count = utilization?.statusBreakdown[status as keyof typeof utilization.statusBreakdown] || 0;
                  const percentage = utilization?.activeTrailers 
                    ? Math.round((count / utilization.activeTrailers) * 100) 
                    : 0;

                  return (
                    <div key={status} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded", color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">{count}</span>
                        <Badge variant="secondary">{percentage}%</Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {/* Date Range Selector */}
          <div className="flex gap-2">
            {(['week', 'month', '30days'] as const).map(range => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(range)}
              >
                {range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'Last 30 Days'}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Events Per Day Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Activity</CardTitle>
                <CardDescription>Events recorded per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventSummary?.eventsPerDay || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => format(new Date(date), 'MMM d')}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        labelFormatter={(date) => format(new Date(date as string), 'MMMM d, yyyy')}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Events by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Events by Type</CardTitle>
                <CardDescription>Breakdown of event types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventTypeChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Top Locations
              </CardTitle>
              <CardDescription>Most active trailer locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eventSummary?.topLocations.map((loc, index) => (
                  <div key={loc.location} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium truncate max-w-[150px]">{loc.location}</span>
                    </div>
                    <Badge>{loc.count} events</Badge>
                  </div>
                ))}
                {(!eventSummary?.topLocations || eventSummary.topLocations.length === 0) && (
                  <p className="text-muted-foreground col-span-full text-center py-4">No location data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {/* Alert Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                  <p className="text-4xl font-bold text-orange-600">{alertsSummary?.active || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-4xl font-bold text-green-600">{alertsSummary?.resolved || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-4xl font-bold text-red-600">{alertsSummary?.bySeverity?.critical || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Alerts List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Alerts</CardTitle>
              <CardDescription>Unresolved trailer alerts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {activeAlerts && activeAlerts.length > 0 ? (
                <div className="space-y-3">
                  {activeAlerts.map((alert: any) => (
                    <div 
                      key={alert.id} 
                      className={cn(
                        "p-4 rounded-lg border",
                        alert.severity === 'critical' ? 'border-red-500/50 bg-red-500/5' : 'border-orange-500/50 bg-orange-500/5'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={cn(
                            "h-5 w-5",
                            alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                          )} />
                          <div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-sm text-muted-foreground">
                              {alert.trailer?.trailer_number} • {format(new Date(alert.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">No active alerts</p>
                  <p className="text-sm">All trailers are operating normally</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
