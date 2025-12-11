import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { DailyStats, MonthlyStats, DriverLeaderboard } from "@/hooks/useRouteStatistics";
import { format, parseISO } from "date-fns";
import { BarChart3, TrendingUp, Users } from "lucide-react";

interface StatisticsChartsProps {
  dailyTrend: DailyStats[];
  monthlyStats: MonthlyStats | null;
  driverLeaderboard: DriverLeaderboard[];
  period: 'day' | 'week' | 'month';
}

export function StatisticsCharts({ dailyTrend, monthlyStats, driverLeaderboard, period }: StatisticsChartsProps) {
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  // Prepare trend data for chart
  const trendChartData = dailyTrend.map(d => ({
    date: format(parseISO(d.date), 'M/d'),
    day: format(parseISO(d.date), 'EEE'),
    stops: d.stopsCompleted,
    revenue: d.revenueCollected,
  }));

  // Driver comparison data
  const driverChartData = driverLeaderboard.slice(0, 5).map(d => ({
    name: d.driverName.split(' ')[0], // First name only
    stops: d.totalStops,
    revenue: d.totalRevenue,
  }));

  // Day of week pattern data
  const dayOfWeekData = monthlyStats?.dayOfWeekPattern || [];

  return (
    <div className="space-y-4">
      {/* Daily Trend Chart */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            {period === 'month' ? '30-Day' : '7-Day'} Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Revenue' : 'Stops'
                  ]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="stops" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Stops"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(142.1 76.2% 36.3%)" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Driver Comparison Bar Chart */}
      {driverChartData.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Driver Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={driverChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? formatCurrency(value) : value,
                      name === 'revenue' ? 'Revenue' : 'Stops'
                    ]}
                  />
                  <Bar dataKey="stops" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Stops" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day of Week Pattern Chart (Month view only) */}
      {period === 'month' && dayOfWeekData.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Day of Week Pattern
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'avgRevenue' ? formatCurrency(value) : value,
                      name === 'avgRevenue' ? 'Avg Revenue' : 'Avg Stops'
                    ]}
                  />
                  <Bar 
                    dataKey="avgStops" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    name="Avg Stops"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
