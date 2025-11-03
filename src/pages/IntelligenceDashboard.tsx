import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PickupPatternsCard } from '@/components/intelligence/PickupPatternsCard';
import { RevenueForecastCard } from '@/components/intelligence/RevenueForecastCard';
import { OperationalMetricsCard } from '@/components/intelligence/OperationalMetricsCard';
import { Brain, TrendingUp } from 'lucide-react';

const IntelligenceDashboard = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-8 w-8" />
            Intelligence Dashboard
            <Badge variant="outline" className="text-xs">Beta</Badge>
          </h1>
          <p className="text-muted-foreground">
            AI-powered insights and predictions for your business
          </p>
        </div>
      </div>

      <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-700 dark:text-blue-400">
              Phase 2: Intelligence Modules Active
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            ✓ Pickup Pattern Intelligence — Detects recurring schedules
          </p>
          <p className="text-sm text-muted-foreground">
            ✓ Revenue Forecasting — Predicts future revenue trends
          </p>
          <p className="text-sm text-muted-foreground">
            ✓ Client Engagement Tracking — Monitors interaction patterns
          </p>
          <p className="text-sm text-muted-foreground">
            ✓ Operational Efficiency Metrics — Tracks daily performance
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <PickupPatternsCard />
        <RevenueForecastCard />
        <OperationalMetricsCard />
      </div>
    </div>
  );
};

export default IntelligenceDashboard;
