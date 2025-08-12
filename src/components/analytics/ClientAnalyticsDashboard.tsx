import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Calendar, Users, DollarSign, Recycle, Upload } from 'lucide-react';
import { useClientSummaries, useClientSummaryAnalytics } from '@/hooks/useClientSummaries';
import { ClientSummaryImport } from '@/components/csv/ClientSummaryImport';
import { MonthlyPerformanceTable } from '@/components/analytics/MonthlyPerformanceTable';
import { useQueryClient } from '@tanstack/react-query';

export function ClientAnalyticsDashboard() {
  const [showImport, setShowImport] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: summaries = [], isLoading } = useClientSummaries({ year: 2025 });
  const { data: analytics, isLoading: analyticsLoading } = useClientSummaryAnalytics(2025);

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['client-summaries'] });
    queryClient.invalidateQueries({ queryKey: ['client-summary-analytics'] });
    setShowImport(false);
  };

  if (isLoading || analyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">2025 Client Analytics</h2>
            <p className="text-muted-foreground">Loading historical data...</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/20">
              <CardContent className="p-6">
                <div className="h-20 bg-secondary/20 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">2025 Client Analytics</h2>
            <p className="text-muted-foreground">Import your client summary data to see analytics</p>
          </div>
          <Button 
            onClick={() => setShowImport(true)}
            className="bg-brand-primary hover:bg-brand-primary-dark"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV Data
          </Button>
        </div>
        
        {showImport && (
          <ClientSummaryImport onSuccess={handleImportSuccess} />
        )}
        
        <Card className="border-border/20">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
            <p className="text-muted-foreground mb-4">
              Upload your 2025 client summary CSV to view comprehensive analytics and trends
            </p>
            <Button 
              onClick={() => setShowImport(true)}
              variant="outline"
              className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">2025 Client Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of {analytics.totals.totalClients} clients with {analytics.totals.totalPickups.toLocaleString()} pickups
          </p>
        </div>
        <Button 
          onClick={() => setShowImport(true)}
          variant="outline"
          className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
        >
          <Upload className="w-4 h-4 mr-2" />
          Update Data
        </Button>
      </div>

      {showImport && (
        <ClientSummaryImport onSuccess={handleImportSuccess} />
      )}

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="interactive-card border-brand-primary/20 bg-gradient-to-br from-card to-brand-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold text-brand-primary">
                  ${(analytics.totals.totalRevenue / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Avg: ${analytics.totals.averageRevenuePerClient.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-brand-primary/15 rounded-xl">
                <DollarSign className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="interactive-card border-brand-recycling/20 bg-gradient-to-br from-card to-brand-recycling/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tires Recycled</p>
                <p className="text-3xl font-bold text-brand-recycling">
                  {analytics.totals.totalPtes.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analytics.totals.totalTons.toFixed(1)} tons total
                </p>
              </div>
              <div className="p-3 bg-brand-recycling/15 rounded-xl">
                <Recycle className="w-5 h-5 text-brand-recycling" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="interactive-card border-brand-secondary/20 bg-gradient-to-br from-card to-brand-secondary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pickups</p>
                <p className="text-3xl font-bold text-brand-secondary">
                  {analytics.totals.totalPickups.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Avg: {analytics.totals.averagePickupSize.toFixed(0)} PTEs
                </p>
              </div>
              <div className="p-3 bg-brand-secondary/15 rounded-xl">
                <TrendingUp className="w-5 h-5 text-brand-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="interactive-card border-brand-accent/20 bg-gradient-to-br from-card to-brand-accent/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                <p className="text-3xl font-bold text-brand-accent">
                  {analytics.totals.totalClients}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Regular service accounts
                </p>
              </div>
              <div className="p-3 bg-brand-accent/15 rounded-xl">
                <Users className="w-5 h-5 text-brand-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="monthly" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
          <TabsTrigger value="clients">Top Clients</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-6">
          <Card className="border-border/20 shadow-elevation-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-primary" />
                Monthly Performance Rankings 2025
              </CardTitle>
              <CardDescription>
                Performance analysis with color-coded gauges showing top performing months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyPerformanceTable monthlyData={analytics.monthlyData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Card className="border-border/20 shadow-elevation-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-primary" />
                Top Performing Clients
              </CardTitle>
              <CardDescription>Ranked by total revenue for 2025</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topClients.map((client, index) => (
                  <div key={client.client_id} className="flex items-center justify-between p-4 rounded-lg border border-border/10 bg-secondary/5">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium">{client.company_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {client.total_pickups} pickups • {client.total_ptes} PTEs
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-brand-primary">
                        ${client.total_revenue.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${(client.total_revenue / client.total_pickups).toFixed(0)}/pickup
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/20 shadow-elevation-lg">
              <CardHeader>
                <CardTitle>Environmental Impact</CardTitle>
                <CardDescription>Recycling achievements for 2025</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>CO₂ Reduction</span>
                  <span className="font-bold text-brand-recycling">
                    {(analytics.totals.totalTons * 2.2).toFixed(1)} tons
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Landfill Diversion</span>
                  <span className="font-bold text-brand-recycling">
                    {analytics.totals.totalTons.toFixed(1)} tons
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Oil Recovery</span>
                  <span className="font-bold text-brand-recycling">
                    {(analytics.totals.totalPtes * 2.5).toFixed(0)} gallons
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/20 shadow-elevation-lg">
              <CardHeader>
                <CardTitle>Efficiency Metrics</CardTitle>
                <CardDescription>Operational performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Avg Revenue/Client</span>
                  <span className="font-bold text-brand-primary">
                    ${analytics.totals.averageRevenuePerClient.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Avg Pickup Size</span>
                  <span className="font-bold text-brand-secondary">
                    {analytics.totals.averagePickupSize.toFixed(0)} PTEs
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Revenue/PTE</span>
                  <span className="font-bold text-brand-accent">
                    ${(analytics.totals.totalRevenue / analytics.totals.totalPtes).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}