import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Gauge,
  TrendingUp,
  TrendingDown,
  User,
  Calendar,
  Trophy,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useRouteStatistics, StatsPeriod } from "@/hooks/useRouteStatistics";
import { format, parseISO } from "date-fns";
import { TreadSetAnimatedLogo } from "@/components/TreadSetAnimatedLogo";
import { StatisticsCharts } from "./StatisticsCharts";
import { ClientTimingInsights } from "./ClientTimingInsights";

interface RouteStatisticsPanelProps {
  activeDay: string;
}

export function RouteStatisticsPanel({ activeDay }: RouteStatisticsPanelProps) {
  const [period, setPeriod] = useState<StatsPeriod>('day');
  const { 
    today, 
    drivers, 
    dailyTrend, 
    weeklyStats, 
    monthlyStats, 
    driverLeaderboard,
    clientInsights,
    isLoading 
  } = useRouteStatistics(activeDay, period);

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const ComparisonBadge = ({ value, suffix = '%' }: { value: number; suffix?: string }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <Badge 
        variant={isPositive ? "default" : "destructive"} 
        className={`text-[10px] px-1.5 py-0 ${isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}`}
      >
        {isPositive ? <ArrowUp className="h-2.5 w-2.5 mr-0.5" /> : <ArrowDown className="h-2.5 w-2.5 mr-0.5" />}
        {Math.abs(value)}{suffix}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <TreadSetAnimatedLogo size="sm" animated showText={false} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Toggle */}
      <div className="flex justify-between items-center">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as StatsPeriod)} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value="day" className="text-xs px-3 h-7">Day</TabsTrigger>
            <TabsTrigger value="week" className="text-xs px-3 h-7">Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs px-3 h-7">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards - Adapt based on period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {period === 'day' ? today.stopsCompleted : 
                   period === 'week' ? weeklyStats?.totalStops || 0 : 
                   monthlyStats?.totalStops || 0}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground">
                    {period === 'day' ? `of ${today.stopsScheduled} Stops` : 
                     period === 'week' ? 'Stops This Week' : 'Stops This Month'}
                  </p>
                  {period === 'week' && weeklyStats && (
                    <ComparisonBadge value={weeklyStats.comparisonToPreviousWeek.stops} />
                  )}
                  {period === 'month' && monthlyStats && (
                    <ComparisonBadge value={monthlyStats.comparisonToPreviousMonth.stops} />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {period === 'day' ? formatMinutes(today.activeMinutes) : 
                   period === 'week' ? (weeklyStats?.avgStopsPerDay?.toFixed(1) || '0') : 
                   (monthlyStats?.avgStopsPerDay?.toFixed(1) || '0')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {period === 'day' ? 'Active Time' : 'Avg Stops/Day'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    period === 'day' ? today.revenueCollected : 
                    period === 'week' ? weeklyStats?.totalRevenue || 0 : 
                    monthlyStats?.totalRevenue || 0
                  )}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground">
                    {period === 'day' ? 'Revenue' : 
                     period === 'week' ? 'This Week' : 'This Month'}
                  </p>
                  {period === 'week' && weeklyStats && (
                    <ComparisonBadge value={weeklyStats.comparisonToPreviousWeek.revenue} />
                  )}
                  {period === 'month' && monthlyStats && (
                    <ComparisonBadge value={monthlyStats.comparisonToPreviousMonth.revenue} />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Gauge className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {period === 'day' ? today.stopsPerHour : 
                   period === 'week' && weeklyStats?.avgRevenuePerDay 
                     ? formatCurrency(weeklyStats.avgRevenuePerDay) 
                     : period === 'month' ? driverLeaderboard.length : today.stopsPerHour}
                </p>
                <p className="text-xs text-muted-foreground">
                  {period === 'day' ? 'Stops/Hour' : 
                   period === 'week' ? 'Avg Rev/Day' : 'Active Drivers'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week/Month: Best Day Highlight */}
      {period === 'week' && weeklyStats?.bestDay && (
        <Card className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-amber-500" />
              <div>
                <p className="text-sm font-semibold">Best Day This Week</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(weeklyStats.bestDay.date), 'EEEE, MMM d')} - 
                  {' '}{weeklyStats.bestDay.stops} stops, {formatCurrency(weeklyStats.bestDay.revenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month: Week by Week Breakdown */}
      {period === 'month' && monthlyStats && monthlyStats.weekByWeekBreakdown.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Week by Week
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {monthlyStats.weekByWeekBreakdown.map((week) => (
                <div 
                  key={week.weekNum}
                  className="p-3 rounded-lg border bg-muted/30"
                >
                  <div className="text-xs text-muted-foreground font-medium">
                    Week {week.weekNum}
                  </div>
                  <div className="text-xs text-muted-foreground/70">
                    {week.startDate}
                  </div>
                  <div className="mt-1 text-lg font-bold">{week.stops}</div>
                  <div className="text-xs text-green-600">{formatCurrency(week.revenue)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver Performance - Day view shows detailed, Week/Month shows leaderboard */}
      {period === 'day' && drivers.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Driver Performance Today
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-center">Stops</TableHead>
                  <TableHead className="text-center">First Stop</TableHead>
                  <TableHead className="text-center">Last Stop</TableHead>
                  <TableHead className="text-center">Active Time</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.driverId}>
                    <TableCell className="font-medium">{driver.driverName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{driver.stopsCompleted}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {driver.firstStopTime || '-'}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {driver.lastStopTime || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatMinutes(driver.activeMinutes)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(driver.revenueCollected)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Week/Month: Driver Leaderboard */}
      {(period === 'week' || period === 'month') && driverLeaderboard.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" />
              Driver Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-center">Stops</TableHead>
                  <TableHead className="text-center">Active Time</TableHead>
                  <TableHead className="text-center">Avg/Stop</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driverLeaderboard.map((driver, index) => (
                  <TableRow key={driver.driverId}>
                    <TableCell>
                      <Badge 
                        variant={index < 3 ? "default" : "secondary"}
                        className={`w-6 h-6 p-0 flex items-center justify-center ${
                          index === 0 ? 'bg-amber-500 hover:bg-amber-500' :
                          index === 1 ? 'bg-gray-400 hover:bg-gray-400' :
                          index === 2 ? 'bg-amber-700 hover:bg-amber-700' : ''
                        }`}
                      >
                        {index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{driver.driverName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{driver.totalStops}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatMinutes(driver.activeMinutes)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatMinutes(driver.avgTimePerStop)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(driver.totalRevenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      {(period === 'week' || period === 'month') && (
        <StatisticsCharts 
          dailyTrend={dailyTrend}
          monthlyStats={monthlyStats}
          driverLeaderboard={driverLeaderboard}
          period={period}
        />
      )}

      {/* Client Insights */}
      {(period === 'week' || period === 'month') && (
        <ClientTimingInsights 
          clientInsights={clientInsights}
          period={period}
        />
      )}

      {/* Day View: 7-Day Trend */}
      {period === 'day' && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              7-Day Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-7 gap-2">
              {dailyTrend.slice(-7).map((day) => {
                const isToday = day.date === activeDay;
                const dayLabel = format(parseISO(day.date), 'EEE');
                const dateLabel = format(parseISO(day.date), 'M/d');
                
                return (
                  <div 
                    key={day.date} 
                    className={`text-center p-2 rounded-lg border ${
                      isToday 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-muted/30 border-border/50'
                    }`}
                  >
                    <div className="text-xs font-medium text-muted-foreground">{dayLabel}</div>
                    <div className="text-[10px] text-muted-foreground/70">{dateLabel}</div>
                    <div className="mt-1">
                      <div className="text-lg font-bold">{day.stopsCompleted}</div>
                      <div className="text-[10px] text-muted-foreground">stops</div>
                    </div>
                    {day.revenueCollected > 0 && (
                      <div className="mt-1 text-xs text-green-600 font-medium">
                        {formatCurrency(day.revenueCollected)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day View: Quick Stats Summary */}
      {period === 'day' && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Daily Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-semibold">
                  {today.stopsScheduled > 0 
                    ? Math.round((today.stopsCompleted / today.stopsScheduled) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Avg Time Per Stop</span>
                <span className="font-semibold">
                  {today.averageStopDuration > 0 
                    ? formatMinutes(today.averageStopDuration) 
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Revenue Per Hour</span>
                <span className="font-semibold text-green-600">
                  {today.activeMinutes > 0 
                    ? formatCurrency(today.revenueCollected / (today.activeMinutes / 60))
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Drivers Active</span>
                <span className="font-semibold">{drivers.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
