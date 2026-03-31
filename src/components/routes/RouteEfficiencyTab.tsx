import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouteEfficiency, type RouteEfficiencyData } from '@/hooks/useRouteEfficiency';
import { Activity } from 'lucide-react';

interface DriverEfficiencyRow {
  driverName: string;
  assignmentIds: string[];
  stopsCompleted: number;
  milesDriven: number;
  avgTimePerStop: number;
  efficiencyScore: number;
}

interface RouteEfficiencyTabProps {
  assignments: Array<{
    id: string;
    driver_id?: string | null;
    vehicle?: { name?: string } | null;
    status?: string | null;
  }>;
}

export function RouteEfficiencyTab({ assignments }: RouteEfficiencyTabProps) {
  const { getMultipleEfficiencies, isLoading } = useRouteEfficiency();
  const [rows, setRows] = useState<DriverEfficiencyRow[]>([]);

  useEffect(() => {
    const completedIds = assignments
      .filter(a => a.status === 'completed')
      .map(a => a.id);

    if (completedIds.length === 0) {
      setRows([]);
      return;
    }

    let cancelled = false;

    getMultipleEfficiencies(completedIds).then((results) => {
      if (cancelled) return;

      // Group by driver
      const driverMap: Record<string, { name: string; data: RouteEfficiencyData[] }> = {};
      
      for (const a of assignments) {
        if (!results[a.id]) continue;
        const key = a.driver_id || 'unassigned';
        const name = a.vehicle?.name || 'Unknown Driver';
        if (!driverMap[key]) driverMap[key] = { name, data: [] };
        driverMap[key].data.push(results[a.id]);
      }

      const driverRows: DriverEfficiencyRow[] = Object.entries(driverMap).map(([, { name, data }]) => {
        const totalStops = data.reduce((s, d) => s + d.stops_completed, 0);
        const totalMiles = data.reduce((s, d) => s + d.total_distance_miles, 0);
        const avgTime = data.reduce((s, d) => s + d.average_time_per_stop_minutes, 0) / data.length;
        const avgScore = data.reduce((s, d) => s + d.efficiency_score, 0) / data.length;

        return {
          driverName: name,
          assignmentIds: [],
          stopsCompleted: totalStops,
          milesDriven: Math.round(totalMiles * 100) / 100,
          avgTimePerStop: Math.round(avgTime * 10) / 10,
          efficiencyScore: Math.round(avgScore * 10) / 10,
        };
      });

      setRows(driverRows.sort((a, b) => b.efficiencyScore - a.efficiencyScore));
    });

    return () => { cancelled = true; };
  }, [assignments, getMultipleEfficiencies]);

  const getScoreBadge = (score: number) => {
    if (score > 80) return <Badge className="bg-green-100 text-green-800 border-green-300">{score}%</Badge>;
    if (score >= 50) return <Badge className="bg-amber-100 text-amber-800 border-amber-300">{score}%</Badge>;
    return <Badge className="bg-red-100 text-red-800 border-red-300">{score}%</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-muted h-12 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            No efficiency data yet. Data appears after drivers complete routes with GPS tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Route Efficiency — Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Driver</th>
                <th className="pb-2 font-medium text-center">Stops</th>
                <th className="pb-2 font-medium text-center">Miles</th>
                <th className="pb-2 font-medium text-center">Avg Time/Stop</th>
                <th className="pb-2 font-medium text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 font-medium">{row.driverName}</td>
                  <td className="py-3 text-center">{row.stopsCompleted}</td>
                  <td className="py-3 text-center">{row.milesDriven}</td>
                  <td className="py-3 text-center">{row.avgTimePerStop} min</td>
                  <td className="py-3 text-center">{getScoreBadge(row.efficiencyScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
