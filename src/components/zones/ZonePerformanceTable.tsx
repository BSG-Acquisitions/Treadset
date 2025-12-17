import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Calendar, Users } from 'lucide-react';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/formatters';

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

  // Fetch zone performance data
  const { data: performance = [], isLoading } = useQuery({
    queryKey: ['zone-performance', organizationId],
    queryFn: async () => {
      if (!organizationId || zones.length === 0) return [];

      // Get clients with their ZIP codes
      const { data: clients } = await supabase
        .from('clients')
        .select('id, physical_zip, company_name')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

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

      // Map clients to zones by ZIP code
      const zonePerformance: ZonePerformance[] = zones.map(zone => {
        const zoneClients = (clients || []).filter(c => 
          c.physical_zip && zone.zip_codes.includes(c.physical_zip)
        );
        const clientIds = new Set(zoneClients.map(c => c.id));

        const zoneRecentPickups = (recentPickups || []).filter(p => clientIds.has(p.client_id));
        const zonePreviousPickups = (previousPickups || []).filter(p => clientIds.has(p.client_id));
        
        const recentRevenue = zoneRecentPickups.reduce((sum, p) => sum + (p.computed_revenue || 0), 0);
        const previousRevenue = zonePreviousPickups.reduce((sum, p) => sum + (p.computed_revenue || 0), 0);
        
        const trendPercent = previousRevenue > 0 
          ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
          : recentRevenue > 0 ? 100 : 0;

        const atRiskInZone = (atRiskClients || []).filter(r => clientIds.has(r.client_id)).length;

        return {
          id: zone.id,
          name: zone.zone_name,
          clientCount: zoneClients.length,
          pickupCount: zoneRecentPickups.length,
          revenue: recentRevenue,
          atRiskCount: atRiskInZone,
          trend: trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'flat',
          trendPercent: Math.abs(Math.round(trendPercent)),
        };
      });

      return zonePerformance.sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !!organizationId && zones.length > 0,
  });

  const handleScheduleRoute = (zoneId: string, zoneName: string) => {
    navigate('/routes-today', { state: { filterZone: zoneName } });
  };

  if (zones.length === 0) {
    return null;
  }

  const TrendIcon = ({ trend, percent }: { trend: string; percent: number }) => {
    if (trend === 'up') return <span className="flex items-center text-green-600 text-xs"><TrendingUp className="h-3 w-3 mr-1" />{percent}%</span>;
    if (trend === 'down') return <span className="flex items-center text-red-600 text-xs"><TrendingDown className="h-3 w-3 mr-1" />{percent}%</span>;
    return <span className="flex items-center text-muted-foreground text-xs"><Minus className="h-3 w-3 mr-1" />Stable</span>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Zone Performance (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading performance data...</div>
        ) : performance.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No zone data available</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead className="text-center">Clients</TableHead>
                <TableHead className="text-center">Pickups</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-center">At-Risk</TableHead>
                <TableHead className="text-center">Trend</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performance.map((zone) => (
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
                      onClick={() => handleScheduleRoute(zone.id, zone.name)}
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
