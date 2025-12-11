import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  User,
  Calendar
} from "lucide-react";
import { useRouteStatistics } from "@/hooks/useRouteStatistics";
import { format, parseISO } from "date-fns";
import { TreadSetAnimatedLogo } from "@/components/TreadSetAnimatedLogo";

interface RouteStatisticsPanelProps {
  activeDay: string;
}

export function RouteStatisticsPanel({ activeDay }: RouteStatisticsPanelProps) {
  const { today, drivers, dailyTrend, isLoading } = useRouteStatistics(activeDay);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <TreadSetAnimatedLogo size="sm" animated showText={false} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{today.stopsCompleted}</p>
                <p className="text-xs text-muted-foreground">
                  of {today.stopsScheduled} Stops Done
                </p>
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
                <p className="text-2xl font-bold">{formatMinutes(today.activeMinutes)}</p>
                <p className="text-xs text-muted-foreground">Active Time</p>
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
                <p className="text-2xl font-bold">{formatCurrency(today.revenueCollected)}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
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
                <p className="text-2xl font-bold">{today.stopsPerHour}</p>
                <p className="text-xs text-muted-foreground">Stops/Hour</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Driver Performance Table */}
      {drivers.length > 0 && (
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

      {/* 7-Day Trend */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            7-Day Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-7 gap-2">
            {dailyTrend.map((day) => {
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

      {/* Quick Stats Summary */}
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
    </div>
  );
}
