import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, subWeeks, subMonths, subQuarters, subYears, differenceInDays, format } from "date-fns";

export type RevenuePeriod = "week" | "month" | "quarter" | "ytd";

interface RevenueMetrics {
  totalRevenue: number;
  collectedRevenue: number;
  outstandingRevenue: number;
  periodComparison: number;
  averagePerDay: number;
}

interface SourceBreakdown {
  manifests: {
    revenue: number;
    count: number;
    percentage: number;
  };
  dropoffs: {
    revenue: number;
    count: number;
    percentage: number;
  };
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  revenue: number;
}

interface RevenueDashboardData {
  metrics: RevenueMetrics;
  sourceBreakdown: SourceBreakdown;
  monthlyData: MonthlyData[];
}

function getPeriodDates(period: RevenuePeriod) {
  const now = new Date();
  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (period) {
    case "week":
      currentStart = startOfWeek(now, { weekStartsOn: 1 });
      previousStart = subWeeks(currentStart, 1);
      previousEnd = currentStart;
      break;
    case "month":
      currentStart = startOfMonth(now);
      previousStart = subMonths(currentStart, 1);
      previousEnd = currentStart;
      break;
    case "quarter":
      currentStart = startOfQuarter(now);
      previousStart = subQuarters(currentStart, 1);
      previousEnd = currentStart;
      break;
    case "ytd":
    default:
      currentStart = startOfYear(now);
      previousStart = subYears(currentStart, 1);
      previousEnd = currentStart;
      break;
  }

  return {
    currentStart,
    currentEnd: now,
    previousStart,
    previousEnd,
  };
}

export function useRevenueDashboard(period: RevenuePeriod) {
  return useQuery({
    queryKey: ["revenue-dashboard", period],
    queryFn: async (): Promise<RevenueDashboardData> => {
      const { currentStart, currentEnd, previousStart, previousEnd } = getPeriodDates(period);
      const currentStartStr = format(currentStart, "yyyy-MM-dd");
      const currentEndStr = format(currentEnd, "yyyy-MM-dd");
      const previousStartStr = format(previousStart, "yyyy-MM-dd");
      const previousEndStr = format(previousEnd, "yyyy-MM-dd");
      const yearStart = format(startOfYear(new Date()), "yyyy-MM-dd");

      // Fetch current period manifests (use 'total' column and 'signed_at' for date)
      const { data: currentManifests, error: cmError } = await supabase
        .from("manifests")
        .select("total, payment_status, signed_at, created_at")
        .in("status", ["COMPLETED", "AWAITING_RECEIVER_SIGNATURE"])
        .gte("signed_at", currentStartStr)
        .lte("signed_at", currentEndStr);

      if (cmError) throw cmError;

      // Fetch current period dropoffs
      const { data: currentDropoffs, error: cdError } = await supabase
        .from("dropoffs")
        .select("computed_revenue, payment_status, dropoff_date")
        .gte("dropoff_date", currentStartStr)
        .lte("dropoff_date", currentEndStr);

      if (cdError) throw cdError;

      // Fetch previous period manifests
      const { data: previousManifests, error: pmError } = await supabase
        .from("manifests")
        .select("total")
        .in("status", ["COMPLETED", "AWAITING_RECEIVER_SIGNATURE"])
        .gte("signed_at", previousStartStr)
        .lt("signed_at", previousEndStr);

      if (pmError) throw pmError;

      // Fetch previous period dropoffs
      const { data: previousDropoffs, error: pdError } = await supabase
        .from("dropoffs")
        .select("computed_revenue")
        .gte("dropoff_date", previousStartStr)
        .lt("dropoff_date", previousEndStr);

      if (pdError) throw pdError;

      // Fetch YTD manifests for monthly chart
      const { data: ytdManifests, error: ymError } = await supabase
        .from("manifests")
        .select("total, signed_at")
        .in("status", ["COMPLETED", "AWAITING_RECEIVER_SIGNATURE"])
        .gte("signed_at", yearStart);

      if (ymError) throw ymError;

      // Fetch YTD dropoffs for monthly chart
      const { data: ytdDropoffs, error: ydError } = await supabase
        .from("dropoffs")
        .select("computed_revenue, dropoff_date")
        .gte("dropoff_date", yearStart);

      if (ydError) throw ydError;

      // Calculate current period metrics
      const manifestRevenue = (currentManifests || []).reduce((sum, m) => sum + (m.total || 0), 0);
      const dropoffRevenue = (currentDropoffs || []).reduce((sum, d) => sum + (d.computed_revenue || 0), 0);
      const totalRevenue = manifestRevenue + dropoffRevenue;

      const collectedManifests = (currentManifests || []).filter(m => m.payment_status === "PAID").reduce((sum, m) => sum + (m.total || 0), 0);
      const collectedDropoffs = (currentDropoffs || []).filter(d => d.payment_status === "PAID").reduce((sum, d) => sum + (d.computed_revenue || 0), 0);
      const collectedRevenue = collectedManifests + collectedDropoffs;

      const outstandingRevenue = totalRevenue - collectedRevenue;

      // Calculate previous period total
      const prevManifestRevenue = (previousManifests || []).reduce((sum, m) => sum + (m.total || 0), 0);
      const prevDropoffRevenue = (previousDropoffs || []).reduce((sum, d) => sum + (d.computed_revenue || 0), 0);
      const previousTotal = prevManifestRevenue + prevDropoffRevenue;

      // Calculate period comparison
      const periodComparison = previousTotal > 0 
        ? ((totalRevenue - previousTotal) / previousTotal) * 100 
        : totalRevenue > 0 ? 100 : 0;

      // Calculate average per day
      const daysInPeriod = Math.max(1, differenceInDays(currentEnd, currentStart) + 1);
      const averagePerDay = totalRevenue / daysInPeriod;

      // Source breakdown
      const manifestCount = (currentManifests || []).length;
      const dropoffCount = (currentDropoffs || []).length;
      const manifestPercentage = totalRevenue > 0 ? (manifestRevenue / totalRevenue) * 100 : 0;
      const dropoffPercentage = totalRevenue > 0 ? (dropoffRevenue / totalRevenue) * 100 : 0;

      // Monthly data aggregation for chart
      const monthlyMap = new Map<string, number>();
      
      // Initialize all 12 months
      for (let i = 0; i < 12; i++) {
        const monthKey = format(new Date(new Date().getFullYear(), i, 1), "yyyy-MM");
        monthlyMap.set(monthKey, 0);
      }

      // Add manifest revenue (using signed_at date)
      (ytdManifests || []).forEach(m => {
        if (m.signed_at) {
          const monthKey = m.signed_at.substring(0, 7);
          monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + (m.total || 0));
        }
      });

      // Add dropoff revenue
      (ytdDropoffs || []).forEach(d => {
        if (d.dropoff_date) {
          const monthKey = d.dropoff_date.substring(0, 7);
          monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + (d.computed_revenue || 0));
        }
      });

      const monthlyData: MonthlyData[] = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, revenue]) => ({
          month,
          monthLabel: format(new Date(month + "-01"), "MMM"),
          revenue,
        }));

      return {
        metrics: {
          totalRevenue,
          collectedRevenue,
          outstandingRevenue,
          periodComparison,
          averagePerDay,
        },
        sourceBreakdown: {
          manifests: {
            revenue: manifestRevenue,
            count: manifestCount,
            percentage: manifestPercentage,
          },
          dropoffs: {
            revenue: dropoffRevenue,
            count: dropoffCount,
            percentage: dropoffPercentage,
          },
        },
        monthlyData,
      };
    },
  });
}
