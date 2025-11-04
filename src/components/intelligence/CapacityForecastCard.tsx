import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, RefreshCw, Info } from 'lucide-react';
import { useCapacityForecast } from '@/hooks/useCapacityForecast';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export const CapacityForecastCard = () => {
  const { user } = useAuth();
  const capacityQuery = useCapacityForecast(user?.currentOrganization?.id);
  const { data: forecasts, isLoading, generateForecast, isGenerating } = capacityQuery;
  const dataUpdatedAt = capacityQuery.dataUpdatedAt;

  const handleRefresh = async () => {
    if (!user?.currentOrganization?.id) return;
    
    try {
      await generateForecast(user.currentOrganization.id);
      toast.success('Capacity forecast updated');
    } catch (error) {
      toast.error('Failed to update forecast');
      console.error('Forecast generation error:', error);
    }
  };

  if (isLoading || !forecasts || forecasts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Capacity Forecast (7 Days)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      Data source: capacity_preview table<br/>
                      Based on 8-week historical PTE averages<br/>
                      Refreshes: Every 15 minutes
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>Predictive load analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Generating forecast from historical data...</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate dynamic scale from forecasts (max = 20% above highest value)
  const maxVolume = Math.max(...forecasts.map(f => f.predicted_tire_volume));
  const dynamicMax = Math.ceil(maxVolume * 1.2);
  
  // Sort forecasts by day of week (Monday=1, Sunday=7) for consistent display
  const chartData = forecasts
    .map((f) => {
      const date = parseISO(f.forecast_date);
      const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      // Convert to Monday-first order (Mon=1, Sun=7)
      const sortOrder = dayOfWeek === 0 ? 7 : dayOfWeek;
      
      return {
        date: format(date, 'EEE'),
        fullDate: format(date, 'MMM d'),
        volume: f.predicted_tire_volume,
        capacity: f.capacity_percentage,
        status: f.capacity_status,
        isWeekend,
        sortOrder,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const getBarColor = (status: string, isWeekend: boolean) => {
    if (isWeekend) return 'hsl(var(--muted))';
    switch (status) {
      case 'critical': return 'hsl(var(--destructive))';
      case 'warning': return 'hsl(var(--warning))';
      default: return 'hsl(var(--success))';
    }
  };

  const avgCapacity = forecasts.reduce((sum, f) => sum + (f.capacity_percentage || 0), 0) / forecasts.length;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Capacity Forecast (7 Days)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      <strong>Data source:</strong> capacity_preview table<br/>
                      <strong>Calculation:</strong> 8-week historical avg (pickups + manifests)<br/>
                      <strong>Scale:</strong> 0 - {dynamicMax.toLocaleString()} PTEs<br/>
                      <strong>Last updated:</strong> {format(lastUpdated, 'MMM d, h:mm a')}<br/>
                      <strong>Auto-refresh:</strong> Every 15 minutes
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>Predictive load analysis (Mon-Sun)</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isGenerating}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Peak Day</p>
            <p className="text-lg font-semibold">{maxVolume.toLocaleString()} PTEs</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Capacity</p>
            <p className="text-lg font-semibold">{avgCapacity.toFixed(1)}%</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'PTEs', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              domain={[0, dynamicMax]}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-sm">{data.fullDate}</p>
                      <p className="text-sm">Volume: {data.volume.toLocaleString()} PTEs</p>
                      <p className="text-sm">Capacity: {data.capacity.toFixed(1)}%</p>
                      {data.isWeekend && <p className="text-xs text-muted-foreground mt-1">Weekend</p>}
                      <Badge 
                        variant={data.status === 'critical' ? 'destructive' : data.status === 'warning' ? 'secondary' : 'default'}
                        className="mt-1"
                      >
                        {data.status}
                      </Badge>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.status, entry.isWeekend)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--success))' }}></div>
              <span className="text-muted-foreground">&lt; 80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--warning))' }}></div>
              <span className="text-muted-foreground">81-95%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
              <span className="text-muted-foreground">&gt; 95%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
              <span className="text-muted-foreground">Weekend</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
