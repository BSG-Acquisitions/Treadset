import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar } from 'lucide-react';
import { usePickupPatterns } from '@/hooks/usePickupPatterns';

interface PickupPatternsCardProps {
  clientId?: string;
}

export const PickupPatternsCard = ({ clientId }: PickupPatternsCardProps) => {
  const { data: patterns, isLoading } = usePickupPatterns(clientId);

  if (isLoading) return null;
  if (!patterns || patterns.length === 0) return null;

  const topPattern = patterns[0];

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
            <span className="font-medium capitalize">{topPattern.pattern_type}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Confidence</span>
            <Badge variant="secondary">{topPattern.confidence_score}%</Badge>
          </div>
          {topPattern.predicted_next_pickup && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Next Predicted</span>
              <span className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(topPattern.predicted_next_pickup).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
