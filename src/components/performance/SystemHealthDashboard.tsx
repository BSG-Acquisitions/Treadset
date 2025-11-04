import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertCircle, CheckCircle, TrendingUp, Activity, Database } from 'lucide-react';
import { format } from 'date-fns';

interface PerformanceAlert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  metric_name: string;
  metric_value: number;
  threshold: number;
  resolved: boolean;
  created_at: string;
}

export function SystemHealthDashboard() {
  // Fetch unresolved alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ['performance-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as PerformanceAlert[];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch metrics for last 90 days
  const { data: metricsData } = useQuery({
    queryKey: ['performance-metrics-90d'],
    queryFn: async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('captured_at', ninetyDaysAgo.toISOString())
        .order('captured_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Fetch system health metrics (calculated from recent metrics)
  const { data: systemHealth } = useQuery({
    queryKey: ['system-health-calculated'],
    queryFn: async () => {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('captured_at', oneHourAgo.toISOString());

      if (error) throw error;

      // Calculate metrics
      const cacheHits = data?.filter(m => m.metric_name === 'cache_hit').reduce((sum, m) => sum + m.metric_value, 0) || 0;
      const cacheMisses = data?.filter(m => m.metric_name === 'cache_miss').reduce((sum, m) => sum + m.metric_value, 0) || 0;
      const cachedTimes = data?.filter(m => m.metric_name === 'cached_query_time').map(m => m.metric_value) || [];
      
      return {
        cache_hit_ratio: cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses)) * 100 : 100,
        avg_cached_response_ms: cachedTimes.length > 0 ? cachedTimes.reduce((a, b) => a + b, 0) / cachedTimes.length : 0,
      };
    },
    refetchInterval: 60000,
  });

  // Process metrics for charts
  const chartData = metricsData
    ? Object.values(
        metricsData.reduce((acc: any, metric) => {
          const date = format(new Date(metric.captured_at), 'MMM dd');
          if (!acc[date]) {
            acc[date] = { date, query_time: [], cache_hit: 0, cache_miss: 0 };
          }
          
          if (metric.metric_name === 'query_execution_time') {
            acc[date].query_time.push(metric.metric_value);
          } else if (metric.metric_name === 'cache_hit') {
            acc[date].cache_hit += metric.metric_value;
          } else if (metric.metric_name === 'cache_miss') {
            acc[date].cache_miss += metric.metric_value;
          }
          
          return acc;
        }, {})
      ).map((d: any) => ({
        date: d.date,
        avgQueryTime: d.query_time.length > 0 
          ? d.query_time.reduce((a: number, b: number) => a + b, 0) / d.query_time.length 
          : 0,
        cacheHitRatio: d.cache_hit + d.cache_miss > 0 
          ? (d.cache_hit / (d.cache_hit + d.cache_miss)) * 100 
          : 100,
      }))
    : [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  const getHealthStatus = () => {
    if (alerts.some(a => a.severity === 'critical')) {
      return { label: 'Critical', color: 'destructive', icon: AlertCircle };
    }
    if (alerts.length > 0) {
      return { label: 'Warning', color: 'secondary', icon: AlertCircle };
    }
    return { label: 'Healthy', color: 'default', icon: CheckCircle };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Health Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor performance metrics and system alerts
        </p>
      </div>

      {/* System Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overall Health</p>
              <div className="flex items-center gap-2 mt-1">
                <healthStatus.icon className="h-4 w-4" />
                <Badge variant={getSeverityColor(healthStatus.color) as any}>
                  {healthStatus.label}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cache Hit Ratio</p>
              <p className="text-2xl font-bold mt-1">
                {systemHealth?.cache_hit_ratio?.toFixed(1) || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Cached Response</p>
              <p className="text-2xl font-bold mt-1">
                {systemHealth?.avg_cached_response_ms?.toFixed(0) || 0}ms
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
              <p className="text-2xl font-bold mt-1">{alerts.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>
              Performance issues requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-2">
                  <Badge variant={getSeverityColor(alert.severity) as any}>
                    {alert.severity}
                  </Badge>
                  {alert.alert_type.replace(/_/g, ' ').toUpperCase()}
                </AlertTitle>
                <AlertDescription>
                  {alert.message}
                  <span className="text-xs text-muted-foreground ml-2">
                    {format(new Date(alert.created_at), 'PPpp')}
                  </span>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Query Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Query Performance (90 Days)
          </CardTitle>
          <CardDescription>
            Average query execution time over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgQueryTime" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Avg Query Time"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cache Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Hit Ratio (90 Days)
          </CardTitle>
          <CardDescription>
            Percentage of requests served from cache
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: 'Hit Rate (%)', angle: -90, position: 'insideLeft' }}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cacheHitRatio" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  name="Cache Hit Ratio"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
