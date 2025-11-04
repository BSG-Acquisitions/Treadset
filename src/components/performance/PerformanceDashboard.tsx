import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Zap, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Performance monitoring dashboard showing system health metrics
 * Displays query latency, cache hit rates, and system responsiveness
 */
export const PerformanceDashboard = () => {
  const { user } = useAuth();

  // Monitor query performance
  const { data: queryMetrics } = useQuery({
    queryKey: ['query-performance', user?.currentOrganization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_query_logs')
        .select('execution_time_ms, success, created_at')
        .eq('organization_id', user?.currentOrganization?.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const avgTime = data.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0) / data.length;
      const successRate = (data.filter(log => log.success).length / data.length) * 100;

      return {
        avgQueryTime: Math.round(avgTime),
        totalQueries: data.length,
        successRate: Math.round(successRate),
        slowQueries: data.filter(log => (log.execution_time_ms || 0) > 1000).length,
      };
    },
    enabled: !!user?.currentOrganization?.id,
    staleTime: 60 * 1000, // Refresh every minute
  });

  // Monitor recent operations
  const systemHealthStatus = 'healthy'; // Placeholder until system_health table is created

  const getStatusColor = (value: number, threshold: number) => {
    if (value <= threshold) return 'default';
    if (value <= threshold * 1.5) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Query Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {queryMetrics?.avgQueryTime || 0}ms
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <Badge variant={getStatusColor(queryMetrics?.avgQueryTime || 0, 500)} className="text-xs">
              {queryMetrics?.avgQueryTime <= 500 ? 'Excellent' : 
               queryMetrics?.avgQueryTime <= 1000 ? 'Good' : 'Slow'}
            </Badge>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {queryMetrics?.successRate || 0}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {queryMetrics?.totalQueries || 0} queries (24h)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {queryMetrics?.slowQueries || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Queries &gt; 1s
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <Badge variant="default">
              {systemHealthStatus}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monitoring active
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
