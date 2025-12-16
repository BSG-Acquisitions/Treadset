import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DollarSign, TrendingUp, TrendingDown, HelpCircle, Truck, Package } from 'lucide-react';
import { useRevenueForecasts } from '@/hooks/useRevenueForecasts';

export const RevenueForecastCard = () => {
  const { data: forecasts, isLoading } = useRevenueForecasts();

  if (isLoading) return null;
  if (!forecasts || forecasts.length === 0) return null;

  const nextForecast = forecasts[0];
  const isPositiveGrowth = (nextForecast.growth_rate || 0) >= 0;

  // Confidence explanations
  const confidenceDetails: Record<string, string> = {
    high: 'Your revenue is very consistent month-to-month, making this prediction reliable.',
    medium: 'Your revenue varies moderately. This prediction is reasonably reliable.',
    low: 'Your revenue varies significantly. Actual results may differ from this prediction.',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            30-Day Revenue Forecast
          </CardTitle>
        </div>
        <CardDescription>Based on pickups + drop-offs from the last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main Forecast Amount */}
          <div className="text-3xl font-bold text-primary">
            ${nextForecast.predicted_revenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>

          {/* Growth Rate */}
          {nextForecast.growth_rate !== undefined && nextForecast.growth_rate !== null && (
            <div className={`flex items-center gap-1 text-sm ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
              {isPositiveGrowth ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{isPositiveGrowth ? '+' : ''}{nextForecast.growth_rate}% vs previous period</span>
            </div>
          )}

          {/* Confidence with Explanation */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Confidence</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      {confidenceDetails[nextForecast.confidence_level || 'medium']}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Badge 
              variant="secondary" 
              className={`capitalize ${
                nextForecast.confidence_level === 'high' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                  : nextForecast.confidence_level === 'low'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  : ''
              }`}
            >
              {nextForecast.confidence_level}
            </Badge>
          </div>

          {/* Data Source Info */}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            Based on {nextForecast.based_on_months || 0} months of historical data
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
