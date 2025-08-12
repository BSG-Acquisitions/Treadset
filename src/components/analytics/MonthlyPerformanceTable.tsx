import { motion } from 'framer-motion';
import { CapacityGauge } from '@/components/CapacityGauge';
import { FadeIn } from '@/components/motion/FadeIn';
import { StaggerList } from '@/components/motion/StaggerList';
import { SlideUp } from '@/components/motion/SlideUp';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface MonthlyData {
  month: number;
  revenue: number;
  pickups: number;
  ptes: number;
}

interface MonthlyPerformanceTableProps {
  monthlyData: MonthlyData[];
}

export function MonthlyPerformanceTable({ monthlyData }: MonthlyPerformanceTableProps) {
  // Calculate performance percentiles for color coding
  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue));
  const maxPickups = Math.max(...monthlyData.map(m => m.pickups));
  const avgRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0) / monthlyData.length;
  
  // Sort months by revenue performance for ranking
  const sortedMonths = [...monthlyData].sort((a, b) => b.revenue - a.revenue);
  
  const getPerformanceScore = (month: MonthlyData) => {
    // Combine revenue and pickup metrics for overall performance
    const revenueScore = (month.revenue / maxRevenue) * 0.7;
    const pickupScore = (month.pickups / maxPickups) * 0.3;
    return Math.round((revenueScore + pickupScore) * 100);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500'; // Excellent
    if (score >= 60) return 'text-green-500';   // Good
    if (score >= 40) return 'text-yellow-500';  // Average
    if (score >= 20) return 'text-orange-500';  // Below Average
    return 'text-red-500';                      // Poor
  };

  const getPerformanceLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    if (score >= 20) return 'Below Avg';
    return 'Poor';
  };

  const getRankBadgeVariant = (rank: number) => {
    if (rank <= 3) return 'default';
    if (rank <= 6) return 'secondary';
    return 'outline';
  };

  return (
    <FadeIn>
      <div className="overflow-hidden rounded-lg border border-border/20">
        <Table>
          <TableHeader>
            <TableRow className="border-border/20">
              <TableHead className="font-semibold">Month</TableHead>
              <TableHead className="font-semibold">Performance</TableHead>
              <TableHead className="font-semibold">Rank</TableHead>
              <TableHead className="font-semibold text-right">Revenue</TableHead>
              <TableHead className="font-semibold text-right">Pickups</TableHead>
              <TableHead className="font-semibold text-right">PTEs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <StaggerList staggerDelay={0.08}>
              {monthlyData.map((month, index) => {
                const score = getPerformanceScore(month);
                const rank = sortedMonths.findIndex(m => m.month === month.month) + 1;
                const isAboveAverage = month.revenue > avgRevenue;
                
                return (
                  <motion.tr
                    key={month.month}
                    variants={{
                      initial: { opacity: 0, y: 20 },
                      animate: { opacity: 1, y: 0 }
                    }}
                    className="border-border/10 hover:bg-secondary/20 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <SlideUp delay={index * 0.05}>
                        {new Date(2025, month.month - 1).toLocaleDateString('en-US', { 
                          month: 'long' 
                        })}
                      </SlideUp>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <CapacityGauge
                          value={score}
                          size={48}
                          strokeWidth={4}
                          animateOnMount
                        />
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${getPerformanceColor(score)}`}>
                            {getPerformanceLabel(score)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {score}% score
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant={getRankBadgeVariant(rank)}
                        className="w-8 h-6 rounded-full flex items-center justify-center font-bold"
                      >
                        #{rank}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={`font-semibold ${isAboveAverage ? 'text-brand-primary' : 'text-muted-foreground'}`}>
                          ${month.revenue.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {isAboveAverage ? '↗ Above avg' : '↘ Below avg'}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <span className="font-medium text-brand-secondary">
                        {month.pickups}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <span className="font-medium text-brand-recycling">
                        {month.ptes.toLocaleString()}
                      </span>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </StaggerList>
          </TableBody>
        </Table>
      </div>
    </FadeIn>
  );
}