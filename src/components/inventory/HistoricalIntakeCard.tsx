import { format } from 'date-fns';
import { TrendingUp, Calendar, BarChart3, Trophy, Truck, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useHistoricalIntakeAverages, type HistoricalIntakeAverages } from '@/hooks/useHistoricalIntakeAverages';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from 'recharts';

export function HistoricalIntakeCard() {
  const { data, isLoading, error } = useHistoricalIntakeAverages(6);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data) {
    return null;
  }
  
  // Prepare chart data (reverse to show oldest first)
  const chartData = [...data.monthlyData]
    .reverse()
    .map(m => ({
      month: format(m.month, 'MMM'),
      tons: m.totalTons,
      isPartial: m.isPartial,
      manifests: m.manifests.count,
      dropoffs: m.dropoffs.count
    }));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Historical Intake Averages
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Rolling averages based on completed months. Use these to plan capacity for buyer orders.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Monthly tire intake for capacity planning
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />
              3-Month Average
            </div>
            <p className="text-2xl font-bold text-primary">
              {data.threeMonthAvgTons.toLocaleString()} tons
            </p>
            <p className="text-xs text-muted-foreground">/month</p>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="h-3.5 w-3.5" />
              6-Month Average
            </div>
            <p className="text-2xl font-bold">
              {data.sixMonthAvgTons.toLocaleString()} tons
            </p>
            <p className="text-xs text-muted-foreground">/month</p>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
              <Trophy className="h-3.5 w-3.5" />
              Peak Month
            </div>
            <p className="text-2xl font-bold">
              {data.peakMonth?.tons.toLocaleString() ?? 0} tons
            </p>
            <p className="text-xs text-muted-foreground">
              {data.peakMonth?.monthLabel ?? 'N/A'}
            </p>
          </div>
        </div>
        
        {/* Bar Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            Monthly Intake Trend
            <Badge variant="outline" className="font-normal">
              <Truck className="h-3 w-3 mr-1" />
              {data.averageLoadsPerMonth} avg loads/month
            </Badge>
          </h4>
          
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}t`}
              />
              <RechartsTooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium">{label} {data.isPartial ? '(partial)' : ''}</p>
                      <p className="text-primary font-bold">{data.tons.toLocaleString()} tons</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {data.manifests} pickups · {data.dropoffs} walk-ins
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="tons" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isPartial ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))'}
                    fillOpacity={entry.isPartial ? 0.5 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          <p className="text-xs text-muted-foreground text-center mt-2">
            Current month shown in gray (partial data)
          </p>
        </div>
        
        {/* Capacity guidance */}
        {data.threeMonthAvgTons > 0 && (
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-sm">
              <span className="font-medium">Capacity Planning:</span>{' '}
              Based on your 3-month average of{' '}
              <span className="font-bold text-primary">{data.threeMonthAvgTons.toLocaleString()} tons/month</span>,
            {data.threeMonthAvgTons >= 200 ? (
                <span className="text-primary font-medium"> you can confidently fulfill 100-200 ton/month orders.</span>
              ) : data.threeMonthAvgTons >= 100 ? (
                <span className="text-accent-foreground font-medium"> you can fulfill up to ~{Math.round(data.threeMonthAvgTons * 0.8)} tons/month with a safety margin.</span>
              ) : (
                <span className="text-muted-foreground"> focus on building intake volume before committing to large orders.</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
