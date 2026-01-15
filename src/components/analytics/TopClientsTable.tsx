import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Truck, ArrowDownToLine } from "lucide-react";

interface TopClientWithBreakdown {
  client_id: string;
  company_name: string;
  totalRevenue: number;
  pickupRevenue: number;
  dropoffRevenue: number;
  pickupCount: number;
  dropoffCount: number;
}

interface TopClientsTableProps {
  clients: TopClientWithBreakdown[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function TopClientsTable({ clients }: TopClientsTableProps) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Top 10 Clients by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No client data available for this period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Top 10 Clients by Revenue
          <span className="text-sm font-normal text-muted-foreground ml-2">
            (Pickup vs Drop-off Breakdown)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary" />
              <Truck className="h-3 w-3" />
              <span>Pickups</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-secondary" />
              <ArrowDownToLine className="h-3 w-3" />
              <span>Drop-offs</span>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Client</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-2 text-right">Pickups</div>
            <div className="col-span-2 text-right">Drop-offs</div>
            <div className="col-span-2">Split</div>
          </div>

          {/* Client Rows */}
          {clients.map((client, index) => {
            const pickupPercent = client.totalRevenue > 0 
              ? (client.pickupRevenue / client.totalRevenue) * 100 
              : 0;

            return (
              <div 
                key={client.client_id} 
                className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                {/* Rank */}
                <div className="col-span-1">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                    {index + 1}
                  </div>
                </div>

                {/* Client Name */}
                <div className="col-span-3">
                  <span className="font-medium truncate block" title={client.company_name}>
                    {client.company_name}
                  </span>
                </div>

                {/* Total Revenue */}
                <div className="col-span-2 text-right">
                  <span className="font-bold">{formatCurrency(client.totalRevenue)}</span>
                </div>

                {/* Pickup Revenue & Count */}
                <div className="col-span-2 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-medium text-primary">
                      {formatCurrency(client.pickupRevenue)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({client.pickupCount} pickup{client.pickupCount !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                {/* Dropoff Revenue & Count */}
                <div className="col-span-2 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-medium text-secondary-foreground">
                      {formatCurrency(client.dropoffRevenue)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({client.dropoffCount} drop-off{client.dropoffCount !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                {/* Split Bar */}
                <div className="col-span-2">
                  <div className="space-y-1">
                    <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
                      <div 
                        className="bg-primary transition-all" 
                        style={{ width: `${pickupPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{Math.round(pickupPercent)}%</span>
                      <span>{Math.round(100 - pickupPercent)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
