import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { RevenueTrend, RevenueByDay, ConcentrationData } from "@/hooks/useClientAnalyticsDeep";

interface RevenueChartsProps {
  revenueTrend: RevenueTrend[];
  revenueByDay: RevenueByDay[];
  concentration: ConcentrationData;
  period: string;
}

const COLORS = [
  '#1A4314',  // TreadSet Deep Green - Top client
  '#2563EB',  // Blue
  '#DC2626',  // Red
  '#F59E0B',  // Amber/Orange
  '#8B5CF6',  // Purple
  '#6B7280',  // Gray - Others
];

const formatCurrency = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
};

export function RevenueTrendChart({ data, period }: { data: RevenueTrend[]; period: string }) {
  // Aggregate data for longer periods
  const chartData = period === 'year' 
    ? aggregateByWeek(data)
    : period === 'quarter'
    ? aggregateByWeek(data)
    : data;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return period === 'week' ? d.toLocaleDateString('en-US', { weekday: 'short' }) 
                    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                tickFormatter={formatCurrency}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value), 'Revenue']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function DayOfWeekChart({ data }: { data: RevenueByDay[] }) {
  // Filter out weekends if no activity
  const filteredData = data.filter((d, i) => i > 0 && i < 6);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue by Day of Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCurrency} className="text-muted-foreground" />
              <Tooltip 
                formatter={(value: number) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value), 'Revenue']}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConcentrationChart({ data }: { data: ConcentrationData }) {
  const chartData = data.topClients.map((c, i) => ({
    name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
    value: c.revenue,
    percent: c.percent,
  }));

  // Add "Others" if there's remaining revenue
  const topTotal = chartData.reduce((sum, c) => sum + c.value, 0);
  const totalFromPercent = data.top5Percent > 0 ? (topTotal / data.top5Percent) * 100 : topTotal;
  const othersValue = totalFromPercent - topTotal;
  if (othersValue > 0) {
    chartData.push({ name: 'Others', value: othersValue, percent: 100 - data.top5Percent });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue Concentration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] flex items-center">
          <ResponsiveContainer width="50%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {chartData.slice(0, 5).map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                />
                <span className="truncate flex-1 text-muted-foreground">{entry.name}</span>
                <span className="font-medium">{Math.round(entry.percent)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function aggregateByWeek(data: RevenueTrend[]): RevenueTrend[] {
  const weeks: { [key: string]: { revenue: number; pickups: number } } = {};
  data.forEach(d => {
    const weekStart = getWeekStart(new Date(d.date));
    if (!weeks[weekStart]) weeks[weekStart] = { revenue: 0, pickups: 0 };
    weeks[weekStart].revenue += d.revenue;
    weeks[weekStart].pickups += d.pickups;
  });
  return Object.entries(weeks).map(([date, stats]) => ({ date, ...stats }));
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().split('T')[0];
}

export function RevenueCharts({ revenueTrend, revenueByDay, concentration, period }: RevenueChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <RevenueTrendChart data={revenueTrend} period={period} />
      <DayOfWeekChart data={revenueByDay} />
      <ConcentrationChart data={concentration} />
    </div>
  );
}
