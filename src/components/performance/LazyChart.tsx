import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load Recharts components to reduce initial bundle
const LineChart = lazy(() => import('recharts').then(mod => ({ default: mod.LineChart })));
const BarChart = lazy(() => import('recharts').then(mod => ({ default: mod.BarChart })));
const AreaChart = lazy(() => import('recharts').then(mod => ({ default: mod.AreaChart })));
const PieChart = lazy(() => import('recharts').then(mod => ({ default: mod.PieChart })));

interface LazyChartProps {
  type: 'line' | 'bar' | 'area' | 'pie';
  children: React.ReactNode;
  fallbackHeight?: number;
}

const ChartFallback = ({ height = 300 }: { height?: number }) => (
  <div className="w-full space-y-2" style={{ height }}>
    <Skeleton className="w-full h-full" />
  </div>
);

export function LazyChart({ type, children, fallbackHeight = 300 }: LazyChartProps) {
  const ChartComponent = {
    line: LineChart,
    bar: BarChart,
    area: AreaChart,
    pie: PieChart,
  }[type];

  return (
    <Suspense fallback={<ChartFallback height={fallbackHeight} />}>
      <ChartComponent>
        {children}
      </ChartComponent>
    </Suspense>
  );
}
