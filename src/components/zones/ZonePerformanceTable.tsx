import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Calendar, Users, Loader2, Database } from 'lucide-react';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/formatters';
import { useBackfillGeography } from '@/hooks/useBackfillGeography';
import { toast } from 'sonner';

interface ZonePerformance {
  id: string;
  name: string;
  clientCount: number;
  pickupCount: number;
  revenue: number;
  atRiskCount: number;
  trend: 'up' | 'down' | 'flat';
  trendPercent: number;
}

export function ZonePerformanceTable() {
  const { data: zones = [] } = useServiceZones();
  const { user } = useAuth();
  const navigate = useNavigate();
  const organizationId = user?.currentOrganization?.id;
  const { runBackfill, isLoading: isBackfilling } = useBackfillGeography();
  const [showDataQuality, setShowDataQuality] = useState(false);

  // Fetch zone performance data - group by CITY when no zones defined
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['zone-performance', organizationId, zones.length],
    queryFn: async () => {
      if (!organizationId) return { performance: [], dataQuality: { total: 0, withCity: 0, withZip: 0 } };

      // Get clients with their geographic data
      const { data: clients } = await supabase
        .from('clients')
        .select('id, physical_zip, physical_city, company_name')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // Calculate data quality stats
      const total = clients?.length || 0;
      const withCity = clients?.filter(c => c.physical_city).length || 0;
      const withZip = clients?.filter(c => c.physical_zip).length || 0;
      const dataQuality = { total, withCity, withZip };

      // Get completed pickups with revenue
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: recentPickups } = await supabase
        .from('pickups')
        .select('id, client_id, computed_revenue, pickup_date')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .gte('pickup_date', thirtyDaysAgo.toISOString().split('T')[0]);

      const { data: previousPickups } = await supabase
        .from('pickups')
        .select('id, client_id, computed_revenue')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .gte('pickup_date', sixtyDaysAgo.toISOString().split('T')[0])
        .lt('pickup_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Get at-risk clients
      const { data: atRiskClients } = await supabase
        .from('client_risk_scores')
        .select('client_id, risk_level')
        .eq('organization_id', organizationId)
        .in('risk_level', ['high', 'medium']);

      // Group by city instead of zone for city-based performance
      const cityStats = new Map<string, { 
        clients: string[], 
        recentPickups: number, 
        recentRevenue: number,
        previousPickups: number,
        previousRevenue: number,
        atRisk: number 
      }>();

      // Build client -> city mapping (normalize with trim to prevent duplicates)
      const clientCityMap = new Map<string, string>();
      (clients || []).forEach(c => {
        const city = (c.physical_city || 'Unknown Location').trim();
        clientCityMap.set(c.id, city);
        
        const existing = cityStats.get(city) || { 
          clients: [], 
          recentPickups: 0, 
          recentRevenue: 0,
          previousPickups: 0,
          previousRevenue: 0,
          atRisk: 0 
        };
        existing.clients.push(c.id);
        cityStats.set(city, existing);
      });

      // Add pickup data
      (recentPickups || []).forEach(p => {
        const city = clientCityMap.get(p.client_id);
        if (city) {
          const stats = cityStats.get(city);
          if (stats) {
            stats.recentPickups++;
            stats.recentRevenue += p.computed_revenue || 0;
          }
        }
      });

      (previousPickups || []).forEach(p => {
        const city = clientCityMap.get(p.client_id);
        if (city) {
          const stats = cityStats.get(city);
          if (stats) {
            stats.previousPickups++;
            stats.previousRevenue += p.computed_revenue || 0;
          }
        }
      });

      // Add at-risk data
      (atRiskClients || []).forEach(r => {
        const city = clientCityMap.get(r.client_id);
        if (city) {
          const stats = cityStats.get(city);
          if (stats) {
            stats.atRisk++;
          }
        }
      });

      // Convert to performance array
      const performance: ZonePerformance[] = Array.from(cityStats.entries())
        .filter(([city]) => city !== 'Unknown Location' || cityStats.get(city)!.clients.length > 0)
        .map(([city, stats]) => {
          const trendPercent = stats.previousRevenue > 0 
            ? ((stats.recentRevenue - stats.previousRevenue) / stats.previousRevenue) * 100 
            : stats.recentRevenue > 0 ? 100 : 0;

          const trend: 'up' | 'down' | 'flat' = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'flat';

          return {
            id: city,
            name: city,
            clientCount: stats.clients.length,
            pickupCount: stats.recentPickups,
            revenue: stats.recentRevenue,
            atRiskCount: stats.atRisk,
            trend,
            trendPercent: Math.abs(Math.round(trendPercent)),
          };
        })
        .filter(z => z.clientCount > 0 || z.pickupCount > 0)
        .sort((a, b) => b.revenue - a.revenue);

      return { performance, dataQuality };
    },
    enabled: !!organizationId,
  });

  const performance = data?.performance || [];
  const dataQuality = data?.dataQuality || { total: 0, withCity: 0, withZip: 0 };

  const handleBackfill = async () => {
    try {
      await runBackfill({ batchSize: 100 });
      refetch();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleScheduleRoute = (cityName: string) => {
    navigate('/routes-today', { state: { filterCity: cityName } });
  };

  const TrendIcon = ({ trend, percent }: { trend: string; percent: number }) => {
    if (trend === 'up') return <span className="flex items-center text-green-600 text-xs"><TrendingUp className="h-3 w-3 mr-1" />{percent}%</span>;
    if (trend === 'down') return <span className="flex items-center text-red-600 text-xs"><TrendingDown className="h-3 w-3 mr-1" />{percent}%</span>;
    return <span className="flex items-center text-muted-foreground text-xs"><Minus className="h-3 w-3 mr-1" />Stable</span>;
  };

  const coveragePercent = dataQuality.total > 0 
    ? Math.round((dataQuality.withCity / dataQuality.total) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              {zones.length > 0 ? 'Zone Performance' : 'City Performance'} (Last 30 Days)
            </CardTitle>
            {dataQuality.total > 0 && (
              <CardDescription className="flex items-center gap-2 mt-1">
                <Database className="h-3 w-3" />
                {coveragePercent}% of clients have city data ({dataQuality.withCity}/{dataQuality.total})
              </CardDescription>
            )}
          </div>
          {coveragePercent < 80 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBackfill}
              disabled={isBackfilling}
            >
              {isBackfilling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Fix Missing Data
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading performance data...</div>
        ) : performance.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">No geographic data available</div>
            {dataQuality.total > 0 && dataQuality.withCity === 0 && (
              <Button onClick={handleBackfill} disabled={isBackfilling}>
                {isBackfilling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Populate Geographic Data
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{zones.length > 0 ? 'Zone' : 'City'}</TableHead>
                <TableHead className="text-center">Clients</TableHead>
                <TableHead className="text-center">Pickups</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-center">At-Risk</TableHead>
                <TableHead className="text-center">Trend</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performance.slice(0, 10).map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {zone.clientCount}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{zone.pickupCount}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(zone.revenue)}
                  </TableCell>
                  <TableCell className="text-center">
                    {zone.atRiskCount > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {zone.atRiskCount}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <TrendIcon trend={zone.trend} percent={zone.trendPercent} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleScheduleRoute(zone.name)}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Schedule
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
