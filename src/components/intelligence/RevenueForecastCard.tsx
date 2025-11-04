import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DollarSign, TrendingUp, Info } from 'lucide-react';
import { useRevenueForecasts } from '@/hooks/useRevenueForecasts';

export const RevenueForecastCard = () => {
  const { data: forecasts, isLoading } = useRevenueForecasts();

  if (isLoading) return null;
  if (!forecasts || forecasts.length === 0) return null;

  const nextForecast = forecasts[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue Forecast
            <Badge variant="outline" className="text-xs">Beta</Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    <strong>Data source:</strong> revenue_forecasts table<br/>
                    <strong>Based on:</strong> client_summaries (8-week patterns)<br/>
                    <strong>Cache:</strong> 6-hour TTL<br/>
                    <strong>Auto-refresh:</strong> Every 15 minutes
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </div>
        <CardDescription>AI-powered revenue predictions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            ${nextForecast.predicted_revenue?.toFixed(2) || '0.00'}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <Badge variant="secondary" className="capitalize">
              {nextForecast.confidence_level}
            </Badge>
          </div>
          {nextForecast.growth_rate && (
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-600">{nextForecast.growth_rate}% growth</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
