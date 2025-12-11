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
import { Building2, TrendingUp } from "lucide-react";
import { ClientInsight } from "@/hooks/useRouteStatistics";

interface ClientTimingInsightsProps {
  clientInsights: ClientInsight[];
  period: 'day' | 'week' | 'month';
}

export function ClientTimingInsights({ clientInsights, period }: ClientTimingInsightsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const periodLabel = period === 'month' ? 'This Month' : 'This Week';

  if (clientInsights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          Top Clients {periodLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-center">Pickups</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
              <TableHead className="text-right">Avg/Pickup</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientInsights.map((client, index) => (
              <TableRow key={client.clientId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={index < 3 ? "default" : "secondary"}
                      className="w-5 h-5 p-0 flex items-center justify-center text-[10px]"
                    >
                      {index + 1}
                    </Badge>
                    <span className="font-medium truncate max-w-[150px]">
                      {client.clientName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{client.pickupCount}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-green-600">
                  {formatCurrency(client.totalRevenue)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(client.avgRevenue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
