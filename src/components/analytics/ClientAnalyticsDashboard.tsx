import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientAnalyticsDeep, AnalyticsPeriod } from "@/hooks/useClientAnalyticsDeep";
import { RevenueCharts, RevenueTrendChart, DayOfWeekChart, ConcentrationChart } from "./RevenueCharts";
import { ClientHealthPanel } from "./ClientHealthPanel";
import { ClientInsightCards } from "./ClientInsightCards";
import { TopClientsTable } from "./TopClientsTable";
import { TrendingUp, TrendingDown, DollarSign, Users, Truck, Package, ArrowDownToLine, Calendar } from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};

function ComparisonBadge({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  
  const isPositive = value > 0;
  return (
    <Badge 
      variant={isPositive ? "default" : "destructive"} 
      className="ml-2 text-xs"
    >
      {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
      {isPositive ? '+' : ''}{Math.round(value)}{suffix}
    </Badge>
  );
}

function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  subtitle 
}: { 
  title: string; 
  value: string; 
  change?: number; 
  icon: any; 
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center">
          <div className="text-2xl font-bold">{value}</div>
          {change !== undefined && <ComparisonBadge value={change} suffix="%" />}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// Generate available years (current year back to 2024)
const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= 2024; year--) {
    years.push(year);
  }
  return years;
};

export function ClientAnalyticsDashboard() {
  const currentYear = new Date().getFullYear();
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // When viewing a past year, force the period to 'year' since week/month/quarter don't make sense
  const effectivePeriod = selectedYear !== currentYear ? 'year' : period;
  const { data: analytics, isLoading } = useClientAnalyticsDeep(effectivePeriod, selectedYear);
  
  const availableYears = getAvailableYears();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          {['Week', 'Month', 'Quarter', 'Year'].map(p => (
            <Skeleton key={p} className="h-10 w-20" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Analytics Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No completed manifests found. Complete some pickups to see analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  const periodLabels: Record<AnalyticsPeriod, string> = {
    week: 'This Week',
    month: 'This Month',
    quarter: 'This Quarter',
    year: 'This Year',
  };

  return (
    <div className="space-y-6">
      {/* Period & Year Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Period Selector - only show for current year */}
          {selectedYear === currentYear && (
            <Tabs value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="quarter">Quarter</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground">
          {selectedYear !== currentYear ? (
            <>Showing data for <span className="font-medium text-foreground">{selectedYear}</span></>
          ) : (
            <>Showing data for <span className="font-medium text-foreground">{periodLabels[effectivePeriod]}</span></>
          )}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          change={analytics.revenueChange}
          icon={DollarSign}
          subtitle={selectedYear !== currentYear ? `vs ${selectedYear - 1}` : `vs last ${effectivePeriod}`}
        />
        <StatCard
          title="Total Pickups"
          value={formatNumber(analytics.totalPickups)}
          change={analytics.pickupsChange}
          icon={Truck}
          subtitle={selectedYear !== currentYear ? `vs ${selectedYear - 1}` : `vs last ${effectivePeriod}`}
        />
        <StatCard
          title="Tires Recycled"
          value={formatNumber(analytics.totalTires)}
          icon={Package}
          subtitle="Total PTEs (converted)"
        />
        <StatCard
          title="Active Clients"
          value={formatNumber(analytics.activeClients)}
          icon={Users}
          subtitle={selectedYear !== currentYear ? `in ${selectedYear}` : `${analytics.newClients.length} new this ${effectivePeriod}`}
        />
      </div>

      {/* Actionable Insights */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Insights & Recommendations</h3>
        <ClientInsightCards insights={analytics.insights} />
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Client Health</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <RevenueTrendChart data={analytics.revenueTrend} period={effectivePeriod} />
            <DayOfWeekChart data={analytics.revenueByDay} />
            <ConcentrationChart data={analytics.concentration} />
          </div>
          
          {/* Quick Client Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">{analytics.growingClients.length}</div>
                <p className="text-sm text-muted-foreground">Growing Clients</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">{analytics.stableClients.length}</div>
                <p className="text-sm text-muted-foreground">Stable Clients</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-600">{analytics.decliningClients.length}</div>
                <p className="text-sm text-muted-foreground">Declining Clients</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-orange-600">{analytics.atRiskClients.length}</div>
                <p className="text-sm text-muted-foreground">At-Risk Clients</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health">
          <ClientHealthPanel
            growingClients={analytics.growingClients}
            stableClients={analytics.stableClients}
            decliningClients={analytics.decliningClients}
            newClients={analytics.newClients}
            atRiskClients={analytics.atRiskClients}
          />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {/* Source Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Pickup Revenue
                    </p>
                    <div className="text-2xl font-bold">{formatCurrency(analytics.pickupRevenue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.totalRevenue > 0 
                        ? Math.round((analytics.pickupRevenue / analytics.totalRevenue) * 100) 
                        : 0}% of total revenue
                    </p>
                  </div>
                  <div className="text-4xl font-light text-primary/20">
                    {analytics.topClientsWithBreakdown.reduce((sum, c) => sum + c.pickupCount, 0)}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-secondary">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <ArrowDownToLine className="h-4 w-4" />
                      Drop-off Revenue
                    </p>
                    <div className="text-2xl font-bold">{formatCurrency(analytics.dropoffRevenue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.totalRevenue > 0 
                        ? Math.round((analytics.dropoffRevenue / analytics.totalRevenue) * 100) 
                        : 0}% of total revenue
                    </p>
                  </div>
                  <div className="text-4xl font-light text-secondary/40">
                    {analytics.topClientsWithBreakdown.reduce((sum, c) => sum + c.dropoffCount, 0)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Clients with Breakdown */}
          <TopClientsTable clients={analytics.topClientsWithBreakdown} />

          <div className="grid gap-4 md:grid-cols-2">
            <RevenueTrendChart data={analytics.revenueTrend} period={effectivePeriod} />
            <ConcentrationChart data={analytics.concentration} />
          </div>

          {/* Day of Week Insights */}
          <div className="grid gap-4 md:grid-cols-2">
            <DayOfWeekChart data={analytics.revenueByDay} />
            <Card>
              <CardHeader>
                <CardTitle>Day Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.revenueByDay
                    .filter((_, i) => i > 0 && i < 6)
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((day, index) => (
                      <div key={day.day} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {index === 0 && <Badge variant="default">Best</Badge>}
                          <span className="font-medium">{day.dayName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{day.pickups} pickups</span>
                          <span className="font-bold">{formatCurrency(day.revenue)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
