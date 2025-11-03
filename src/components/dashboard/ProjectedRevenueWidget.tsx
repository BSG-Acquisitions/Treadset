import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Download, Calendar } from 'lucide-react';
import { useRevenueForecasts } from '@/hooks/useRevenueForecasts';
import { useTriggerRevenueForecast } from '@/hooks/useTriggerRevenueForecast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';

export const ProjectedRevenueWidget = () => {
  const { data: forecasts, isLoading } = useRevenueForecasts();
  const { mutate: triggerForecast, isPending } = useTriggerRevenueForecast();
  const [selectedRange, setSelectedRange] = useState<30 | 60 | 90>(90);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Loading forecast...</div>
        </CardContent>
      </Card>
    );
  }

  if (!forecasts || forecasts.length === 0) {
    return (
      <Card>
      <CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No forecast data available.
          </div>
          <Button 
            onClick={() => triggerForecast()} 
            disabled={isPending}
            className="mt-4"
          >
            {isPending ? 'Calculating...' : 'Generate Initial Forecast'}
          </Button>
        </CardContent>
      </CardHeader>
      </Card>
    );
  }

  const handleExportCSV = () => {
    const csv = [
      ['Forecast Date', 'Predicted Revenue', 'Confidence', 'Growth Rate'],
      ...forecasts.map(f => [
        f.forecast_month,
        f.predicted_revenue?.toString() || '0',
        f.confidence_level,
        f.growth_rate?.toString() || '0',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-forecast-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredForecasts = forecasts.filter(f => {
    const forecastDate = new Date(f.forecast_month);
    const daysAhead = Math.ceil((forecastDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysAhead <= selectedRange;
  });

  const chartData = filteredForecasts.map(f => ({
    date: format(new Date(f.forecast_month), 'MMM d'),
    revenue: f.predicted_revenue || 0,
    upper: (f.predicted_revenue || 0) * 1.15, // 15% confidence interval
    lower: (f.predicted_revenue || 0) * 0.85,
  }));

  const latestForecast = filteredForecasts[filteredForecasts.length - 1];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projected Revenue
              <Badge variant="outline" className="text-xs">Beta</Badge>
            </CardTitle>
            <CardDescription>AI-powered revenue forecasting with confidence intervals</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-2">
            {[30, 60, 90].map(days => (
              <Button
                key={days}
                variant={selectedRange === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRange(days as 30 | 60 | 90)}
              >
                {days} Days
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Predicted</div>
            <div className="text-2xl font-bold">
              ${latestForecast?.predicted_revenue?.toFixed(2) || '0.00'}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Confidence</div>
            <Badge variant="secondary" className="capitalize mt-1">
              {latestForecast?.confidence_level || 'N/A'}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Growth Rate</div>
            <div className={`text-lg font-medium ${(latestForecast?.growth_rate || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {latestForecast?.growth_rate?.toFixed(1) || '0.0'}%
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => `$${value.toFixed(2)}`}
              labelStyle={{ color: 'black' }}
            />
            <Area 
              type="monotone" 
              dataKey="upper" 
              stackId="1"
              stroke="none"
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
            />
            <Area 
              type="monotone" 
              dataKey="lower" 
              stackId="1"
              stroke="none"
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="text-xs text-muted-foreground">
          Based on {latestForecast?.based_on_months || 0} months of historical data. 
          Forecast updated nightly at midnight.
        </div>
      </CardContent>
    </Card>
  );
};
