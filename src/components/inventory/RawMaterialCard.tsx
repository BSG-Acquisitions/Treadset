import { Scale, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRawMaterialProjections } from '@/hooks/useRawMaterialProjections';

export function RawMaterialCard() {
  const { data: projections, isLoading } = useRawMaterialProjections();
  
  if (isLoading) {
    return (
      <Card className="bg-accent/50 border-accent">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Raw Materials
          </CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const tons = projections?.totalUnprocessedTons ?? 0;
  const dailyAvg = projections?.dailyAverageTons ?? 0;
  
  return (
    <Card className="bg-accent/50 border-accent">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Raw Materials
        </CardTitle>
        <Scale className="h-4 w-4 text-accent-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-bold">{tons.toLocaleString()} tons</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>+{dailyAvg.toLocaleString()} tons/day avg</span>
        </div>
      </CardContent>
    </Card>
  );
}
