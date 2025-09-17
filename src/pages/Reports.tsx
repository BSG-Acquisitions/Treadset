import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, TrendingUp, Scale, Recycle, ArrowLeft, Home } from "lucide-react";
import { format } from "date-fns";
import { useRecyclingReports } from "@/hooks/useRecyclingReports";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const Reports = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { data: reports, isLoading, error } = useRecyclingReports(selectedYear);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading reports: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="p-0 h-auto font-normal hover:text-foreground">
          <Link to="/" className="flex items-center gap-1">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <span>/</span>
        <span className="text-foreground">Reports</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tire Recycling Reports</h1>
        <p className="text-muted-foreground">
          Track tire recycling performance across different time periods
        </p>
      </div>

      {/* Year Selector */}
      <div className="flex items-center gap-4">
        <label htmlFor="year" className="text-sm font-medium">Year:</label>
        <select
          id="year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-1 border border-border rounded-md bg-background"
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tires YTD</CardTitle>
            <Recycle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(reports?.summary.totalTires || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(reports?.summary.totalPTE || 0)} PTE equivalent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Weight YTD</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(reports?.summary.totalWeight || 0)}</div>
            <p className="text-xs text-muted-foreground">tons recycled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manifests Completed</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(reports?.summary.totalManifests || 0)}</div>
            <p className="text-xs text-muted-foreground">this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tires/Manifest</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports?.summary.totalManifests 
                ? Math.round((reports.summary.totalTires / reports.summary.totalManifests) * 10) / 10
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">average per pickup</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          <TabsTrigger value="tire-types">By Tire Type</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown</CardTitle>
              <CardDescription>Tire recycling data by month for {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports?.monthly.map((month) => (
                  <Card key={month.month} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{format(new Date(selectedYear, month.month - 1), 'MMMM')}</h4>
                      <Badge variant="outline">{month.manifests} manifests</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total Tires:</span>
                        <span className="font-medium">{formatNumber(month.totalTires)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PTE:</span>
                        <span className="font-medium">{formatNumber(month.totalPTE)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weight:</span>
                        <span className="font-medium">{formatNumber(month.totalWeight)} tons</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quarterly">
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Summary</CardTitle>
              <CardDescription>Tire recycling data by quarter for {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reports?.quarterly.map((quarter) => (
                  <Card key={quarter.quarter} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">Q{quarter.quarter}</h4>
                      <Badge variant="outline">{quarter.manifests} manifests</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total Tires:</span>
                        <span className="font-medium">{formatNumber(quarter.totalTires)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PTE:</span>
                        <span className="font-medium">{formatNumber(quarter.totalPTE)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weight:</span>
                        <span className="font-medium">{formatNumber(quarter.totalWeight)} tons</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tire-types">
          <Card>
            <CardHeader>
              <CardTitle>Breakdown by Tire Type</CardTitle>
              <CardDescription>YTD tire recycling by category for {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports?.tireTypes.map((type) => (
                  <Card key={type.type} className="p-4">
                    <div className="mb-2">
                      <h4 className="font-semibold">{type.type}</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Count:</span>
                        <span className="font-medium">{formatNumber(type.count)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>% of Total:</span>
                        <span className="font-medium">
                          {reports?.summary.totalTires 
                            ? Math.round((type.count / reports.summary.totalTires) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;