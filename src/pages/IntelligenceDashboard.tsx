import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PickupPatternsCard } from '@/components/intelligence/PickupPatternsCard';
import { RevenueForecastCard } from '@/components/intelligence/RevenueForecastCard';
import { OperationalMetricsCard } from '@/components/intelligence/OperationalMetricsCard';
import { AIInsightsCard } from '@/components/intelligence/AIInsightsCard';
import { CapacityForecastCard } from '@/components/intelligence/CapacityForecastCard';
import { BookingRequestsWidget } from '@/components/intelligence/BookingRequestsWidget';
import { EmailOutreachWidget } from '@/components/intelligence/EmailOutreachWidget';
import { BookingFunnelWidget } from '@/components/intelligence/BookingFunnelWidget';
import { Brain, TrendingUp, Zap, CalendarPlus, Filter } from 'lucide-react';
import { FadeIn } from '@/components/motion/FadeIn';
import { SlideUp } from '@/components/motion/SlideUp';
import { useEffect } from 'react';

const IntelligenceDashboard = () => {
  useEffect(() => {
    document.title = 'Intelligence Dashboard – TreadSet';
  }, []);

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

      {/* Self-Scheduling & Outreach */}
      <SlideUp delay={0.3}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-brand-accent" />
            <h2 className="text-xl font-semibold text-foreground">Self-Scheduling & Outreach</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <BookingRequestsWidget />
            <EmailOutreachWidget />
          </div>
        </div>
      </SlideUp>

      {/* Booking Funnel Analytics */}
      <SlideUp delay={0.35}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-brand-accent" />
            <h2 className="text-xl font-semibold text-foreground">Conversion Analytics</h2>
          </div>
          <BookingFunnelWidget />
        </div>
      </SlideUp>

      {/* Operational Intelligence */}
      <SlideUp delay={0.4}>
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
