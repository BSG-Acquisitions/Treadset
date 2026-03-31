import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { useRouteEfficiency, type RouteEfficiencyData } from '@/hooks/useRouteEfficiency';

interface TodayEfficiencyCardProps {
  completedAssignmentIds: string[];
}

export function TodayEfficiencyCard({ completedAssignmentIds }: TodayEfficiencyCardProps) {
  const { getMultipleEfficiencies } = useRouteEfficiency();
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [totalMiles, setTotalMiles] = useState(0);
  const [totalStops, setTotalStops] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (completedAssignmentIds.length === 0) {
      setAvgScore(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getMultipleEfficiencies(completedAssignmentIds).then((results) => {
      if (cancelled) return;
      const values = Object.values(results);
      if (values.length === 0) {
        setAvgScore(null);
        setLoading(false);
        return;
      }

      const totalScore = values.reduce((sum, v) => sum + v.efficiency_score, 0);
      setAvgScore(Math.round((totalScore / values.length) * 10) / 10);
      setTotalMiles(values.reduce((sum, v) => sum + v.total_distance_miles, 0));
      setTotalStops(values.reduce((sum, v) => sum + v.stops_completed, 0));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [completedAssignmentIds, getMultipleEfficiencies]);

  const getScoreColor = (score: number) => {
    if (score > 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score > 80) return 'bg-green-50 border-green-200';
    if (score >= 50) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse bg-muted h-16 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (avgScore === null) return null;

  return (
    <Card className={`border ${getScoreBg(avgScore)}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Today's Route Efficiency</CardTitle>
        <Activity className={`h-4 w-4 ${getScoreColor(avgScore)}`} />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <span className={`text-3xl font-bold ${getScoreColor(avgScore)}`}>
            {avgScore}%
          </span>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>{totalStops} stops • {Math.round(totalMiles * 10) / 10} mi</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
