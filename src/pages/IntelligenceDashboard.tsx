import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PickupPatternsCard } from '@/components/intelligence/PickupPatternsCard';
import { RevenueForecastCard } from '@/components/intelligence/RevenueForecastCard';
import { OperationalMetricsCard } from '@/components/intelligence/OperationalMetricsCard';
import { AIInsightsCard } from '@/components/intelligence/AIInsightsCard';
import { CapacityForecastCard } from '@/components/intelligence/CapacityForecastCard';
import { Brain, TrendingUp, Zap, Clock, Bell, CheckCircle } from 'lucide-react';
import { FadeIn } from '@/components/motion/FadeIn';
import { SlideUp } from '@/components/motion/SlideUp';
import { useEffect } from 'react';
import { usePickupPatterns } from '@/hooks/usePickupPatterns';

const IntelligenceDashboard = () => {
  useEffect(() => {
    document.title = 'Intelligence Dashboard – TreadSet';
  }, []);

  const { data: patterns } = usePickupPatterns();

  return (
    <div className="space-y-8">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-brand-primary" />
              <h1 className="text-3xl font-bold text-foreground">Intelligence Dashboard</h1>
              <Badge variant="secondary" className="text-xs">Beta</Badge>
            </div>
            <p className="text-muted-foreground mt-2">
              AI-powered insights and predictive analytics to help you make data-driven decisions
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Pattern Detection Status */}
      <FadeIn delay={0.05}>
        <Card className="border-brand-primary/20 bg-gradient-to-br from-card to-brand-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Automated Pickup Pattern Detection
            </CardTitle>
            <CardDescription>
              The system automatically learns client pickup schedules and notifies you when regular clients need scheduling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Pattern Analysis</p>
                    <p className="text-xs text-muted-foreground">Daily at 2:00 AM</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Missing Pickup Check</p>
                    <p className="text-xs text-muted-foreground">Daily at 8:00 AM</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Auto Notifications</p>
                    <p className="text-xs text-muted-foreground">In notification bell</p>
                  </div>
                </div>
              </div>
              
              {patterns && patterns.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border/50">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    Currently tracking <span className="font-medium text-foreground">{patterns.length}</span> client{patterns.length !== 1 ? 's' : ''} with regular pickup patterns
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* AI Insights Section */}
      <SlideUp delay={0.1}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-accent" />
            <h2 className="text-xl font-semibold text-foreground">AI-Generated Insights</h2>
          </div>
          <AIInsightsCard />
        </div>
      </SlideUp>

      {/* Forecasting Section */}
      <SlideUp delay={0.2}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-accent" />
            <h2 className="text-xl font-semibold text-foreground">Forecasting & Predictions</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <RevenueForecastCard />
            <CapacityForecastCard />
          </div>
        </div>
      </SlideUp>

      {/* Operational Intelligence */}
      <SlideUp delay={0.3}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-brand-accent" />
            <h2 className="text-xl font-semibold text-foreground">Operational Intelligence</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <OperationalMetricsCard />
            <PickupPatternsCard />
          </div>
        </div>
      </SlideUp>
    </div>
  );
};

export default IntelligenceDashboard;
