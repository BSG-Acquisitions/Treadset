import { useMemo } from 'react';
import { format } from 'date-fns';
import { Scale, TrendingUp, TrendingDown, Clock, Truck, ArrowDownToLine, Factory, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useRawMaterialProjections } from '@/hooks/useRawMaterialProjections';
import { HistoricalIntakeCard } from './HistoricalIntakeCard';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
export function ProjectionsTab() {
  const { data: projections, isLoading, error } = useRawMaterialProjections();
  
  // Aggregate daily intake data for chart
  const chartData = useMemo(() => {
    if (!projections?.dailyIntake.length) return [];
    
    // Group by date
    const byDate = projections.dailyIntake.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = { date: item.date, manifests: 0, dropoffs: 0, total: 0 };
      }
      if (item.source === 'manifest') {
        acc[item.date].manifests += item.tons;
      } else {
        acc[item.date].dropoffs += item.tons;
      }
      acc[item.date].total += item.tons;
      return acc;
    }, {} as Record<string, { date: string; manifests: number; dropoffs: number; total: number }>);
    
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        dateLabel: format(new Date(d.date), 'MMM d'),
        manifests: Math.round(d.manifests * 100) / 100,
        dropoffs: Math.round(d.dropoffs * 100) / 100,
        total: Math.round(d.total * 100) / 100
      }));
  }, [projections?.dailyIntake]);
  
  // Source breakdown for pie chart
  const sourceData = useMemo(() => {
    if (!projections) return [];
    return [
      { name: 'Pickups', value: projections.intakeBySource.manifests.tons, color: 'hsl(var(--primary))' },
      { name: 'Walk-ins', value: projections.intakeBySource.dropoffs.tons, color: 'hsl(var(--accent))' }
    ].filter(d => d.value > 0);
  }, [projections]);
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Projections</h3>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!projections) return null;
  
  const netFlow = projections.dailyAverageTons - projections.processingRate;
  const isAccumulating = netFlow > 0;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unprocessed Tires
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projections.totalUnprocessedTons.toLocaleString()} tons</div>
            <p className="text-xs text-muted-foreground mt-1">
              {projections.totalUnprocessedPTE.toLocaleString()} PTE
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month's Intake
            </CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projections.periodIntakeTons.toLocaleString()} tons</div>
            <p className="text-xs text-muted-foreground mt-1">
              {projections.periodIntakePTE.toLocaleString()} PTE from {projections.intakeBySource.manifests.count + projections.intakeBySource.dropoffs.count} loads
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processing Rate
            </CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projections.processingRate.toLocaleString()} tons/day</div>
            <p className="text-xs text-muted-foreground mt-1">
              {projections.periodProcessedTons.toLocaleString()} tons this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Days of Supply
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projections.daysOfSupplyRemaining === Infinity 
                ? '∞' 
                : projections.daysOfSupplyRemaining.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              at current processing rate
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Net Flow Indicator */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Material Flow
            <Badge variant={isAccumulating ? 'default' : 'secondary'} className="font-normal">
              {isAccumulating ? (
                <>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Accumulating
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Depleting
                </>
              )}
            </Badge>
          </CardTitle>
          <CardDescription>
            Daily intake vs processing output
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Daily Intake</span>
              <span className="font-medium">{projections.dailyAverageTons.toLocaleString()} tons/day</span>
            </div>
            <Progress 
              value={projections.processingRate > 0 
                ? Math.min(100, (projections.dailyAverageTons / projections.processingRate) * 50)
                : 100
              } 
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Processing Output</span>
              <span className="font-medium">{projections.processingRate.toLocaleString()} tons/day</span>
            </div>
            <p className="text-sm text-muted-foreground border-t pt-3">
              {isAccumulating 
                ? `Net gain of ${Math.abs(netFlow).toFixed(2)} tons/day — raw materials are building up`
                : netFlow < 0
                  ? `Net reduction of ${Math.abs(netFlow).toFixed(2)} tons/day — processing faster than intake`
                  : 'Intake and processing are balanced'
              }
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Intake Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Intake Trend</CardTitle>
            <CardDescription>
              Tires received by day ({format(projections.periodStart, 'MMM yyyy')})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="dateLabel" 
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
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)} tons`, '']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="manifests" 
                    name="Pickups"
                    stackId="1"
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="dropoffs" 
                    name="Walk-ins"
                    stackId="1"
                    stroke="hsl(var(--accent))" 
                    fill="hsl(var(--accent))"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No intake data for this period
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Source Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Intake by Source</CardTitle>
            <CardDescription>
              Breakdown of tire intake sources this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              {sourceData.length > 0 ? (
                <>
                  <ResponsiveContainer width={150} height={150}>
                    <PieChart>
                      <Pie
                        data={sourceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                      >
                        {sourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)} tons`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        <span className="text-sm">Pickups (Manifests)</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{projections.intakeBySource.manifests.tons.toLocaleString()} tons</div>
                        <div className="text-xs text-muted-foreground">{projections.intakeBySource.manifests.count} loads</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowDownToLine className="h-4 w-4 text-accent-foreground" />
                        <span className="text-sm">Walk-ins (Drop-offs)</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{projections.intakeBySource.dropoffs.tons.toLocaleString()} tons</div>
                        <div className="text-xs text-muted-foreground">{projections.intakeBySource.dropoffs.count} customers</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-[150px] flex items-center justify-center text-muted-foreground">
                  No intake data for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Month-End Projection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Month-End Projection</CardTitle>
          <CardDescription>
            Estimated raw material inventory at end of {format(projections.periodEnd, 'MMMM yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Current</p>
              <p className="text-2xl font-bold">{projections.totalUnprocessedTons.toLocaleString()} tons</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Days Remaining</p>
              <p className="text-2xl font-bold">{projections.daysInPeriod - projections.daysElapsed}</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Projected Month-End</p>
              <p className="text-2xl font-bold text-primary">{projections.projectedMonthEndTons.toLocaleString()} tons</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Historical Intake Averages */}
      <HistoricalIntakeCard />
    </div>
  );
}
