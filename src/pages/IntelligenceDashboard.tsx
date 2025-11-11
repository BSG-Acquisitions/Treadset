import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PickupPatternsCard } from '@/components/intelligence/PickupPatternsCard';
import { RevenueForecastCard } from '@/components/intelligence/RevenueForecastCard';
import { OperationalMetricsCard } from '@/components/intelligence/OperationalMetricsCard';
import { AIInsightsCard } from '@/components/intelligence/AIInsightsCard';
import { CapacityForecastCard } from '@/components/intelligence/CapacityForecastCard';
import { Brain, TrendingUp, Zap, RefreshCw, Bell } from 'lucide-react';
import { FadeIn } from '@/components/motion/FadeIn';
import { SlideUp } from '@/components/motion/SlideUp';
import { useEffect } from 'react';
import { useAnalyzePickupPatterns, useCheckMissingPickups, usePickupPatterns } from '@/hooks/usePickupPatterns';

const IntelligenceDashboard = () => {
  useEffect(() => {
    document.title = 'Intelligence Dashboard – TreadSet';
  }, []);

  const { data: patterns } = usePickupPatterns();
  const analyzePatterns = useAnalyzePickupPatterns();
  const checkMissing = useCheckMissingPickups();

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

      {/* Pattern Detection Controls */}
      <FadeIn delay={0.05}>
        <Card className="border-brand-primary/20 bg-gradient-to-br from-card to-brand-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Pickup Pattern Detection
            </CardTitle>
            <CardDescription>
              Analyze client behavior to automatically detect pickup schedules and get notified when regular clients aren't scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => analyzePatterns.mutate()}
                disabled={analyzePatterns.isPending}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${analyzePatterns.isPending ? 'animate-spin' : ''}`} />
                {analyzePatterns.isPending ? 'Analyzing...' : 'Analyze Pickup Patterns'}
              </Button>
              <Button 
                onClick={() => checkMissing.mutate()}
                disabled={checkMissing.isPending}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Bell className={`h-4 w-4 ${checkMissing.isPending ? 'animate-pulse' : ''}`} />
                {checkMissing.isPending ? 'Checking...' : 'Check for Missing Pickups'}
              </Button>
            </div>
            {patterns && patterns.length > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                Currently tracking {patterns.length} client{patterns.length !== 1 ? 's' : ''} with regular pickup patterns
              </p>
            )}
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
