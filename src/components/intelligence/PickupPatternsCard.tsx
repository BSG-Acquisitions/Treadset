import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar } from 'lucide-react';
import { usePickupPatterns } from '@/hooks/usePickupPatterns';

interface PickupPatternsCardProps {
  clientId?: string;
}

export const PickupPatternsCard = ({ clientId }: PickupPatternsCardProps) => {
  const { data: patterns, isLoading } = usePickupPatterns();

  if (isLoading) return null;
  if (!patterns || patterns.length === 0) return null;

  // Filter by clientId if provided
  const filteredPatterns = clientId 
    ? patterns.filter(p => p.client_id === clientId)
    : patterns;

  if (filteredPatterns.length === 0) return null;

  const topPattern = filteredPatterns[0];
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const typicalDay = topPattern.typical_day_of_week !== null 
    ? dayNames[topPattern.typical_day_of_week] 
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pickup Pattern Intelligence
          </CardTitle>
          <Badge variant="outline" className="text-xs">Beta</Badge>
        </div>
        <CardDescription>AI-detected pickup frequency</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pattern Type</span>
            <span className="font-medium capitalize">{topPattern.frequency}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Confidence</span>
            <Badge variant="secondary">{topPattern.confidence_score}%</Badge>
          </div>
          {typicalDay && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Typical Day</span>
              <span className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {typicalDay}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Avg Interval</span>
            <span className="font-medium">{topPattern.average_days_between_pickups} days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
