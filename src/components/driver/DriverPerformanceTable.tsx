import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDriverPerformance, useCalculateDriverPerformance, DriverPerformanceMetrics } from '@/hooks/useDriverPerformance';
import { ArrowUpDown, RefreshCw, TrendingUp, Clock, MapPin, CheckCircle2, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

type SortField = 'name' | 'stops' | 'onTime' | 'duration' | 'mileage';
type SortDirection = 'asc' | 'desc';

export const DriverPerformanceTable = () => {
  const { data: performance, isLoading } = useDriverPerformance();
  const calculatePerformance = useCalculateDriverPerformance();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPerformance = [...(performance || [])].sort((a, b) => {
    let aValue: number | string = 0;
    let bValue: number | string = 0;

    switch (sortField) {
      case 'name':
        aValue = `${a.driver?.first_name} ${a.driver?.last_name}`;
        bValue = `${b.driver?.first_name} ${b.driver?.last_name}`;
        break;
      case 'stops':
        aValue = a.avg_stops_per_day;
        bValue = b.avg_stops_per_day;
        break;
      case 'onTime':
        aValue = a.on_time_rate;
        bValue = b.on_time_rate;
        break;
      case 'duration':
        aValue = a.avg_pickup_duration_minutes;
        bValue = b.avg_pickup_duration_minutes;
        break;
      case 'mileage':
        aValue = a.avg_mileage_per_stop;
        bValue = b.avg_mileage_per_stop;
        break;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const getOnTimeRateVariant = (rate: number) => {
    if (rate >= 90) return 'default';
    if (rate >= 75) return 'secondary';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Driver Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const lastCalculated = performance?.[0]?.last_calculated_at;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Driver Performance Analytics
            </CardTitle>
            <CardDescription>
              Last 30 days • 
              {lastCalculated && ` Updated ${formatDistanceToNow(new Date(lastCalculated), { addSuffix: true })}`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calculatePerformance.mutate()}
            disabled={calculatePerformance.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${calculatePerformance.isPending ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!performance || performance.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No driver performance data available</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => calculatePerformance.mutate()}
              disabled={calculatePerformance.isPending}
            >
              Calculate Performance
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('name')}
                      className="h-8 px-2 lg:px-3"
                    >
                      Driver
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('stops')}
                      className="h-8 px-2 lg:px-3"
                    >
                      Avg Stops/Day
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('onTime')}
                      className="h-8 px-2 lg:px-3"
                    >
                      On-Time Rate
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('duration')}
                      className="h-8 px-2 lg:px-3"
                    >
                      Avg Duration
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('mileage')}
                      className="h-8 px-2 lg:px-3"
                    >
                      Miles/Stop
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPerformance.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {driver.driver?.first_name} {driver.driver?.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {driver.completed_assignments} / {driver.total_assignments} completed
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">
                          {driver.avg_stops_per_day.toFixed(1)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={getOnTimeRateVariant(driver.on_time_rate)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {driver.on_time_rate.toFixed(0)}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">
                          {driver.avg_pickup_duration_minutes} min
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">
                        {driver.avg_mileage_per_stop.toFixed(1)} mi
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="w-24 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={driver.daily_stops_trend.slice(-7)}>
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};