import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
import { useDropoffs } from "@/hooks/useDropoffs";
import { useHaulerProfile } from "@/hooks/useIndependentHaulers";
import { useHaulerCustomers } from "@/hooks/useHaulerCustomers";
import { CreateHaulerManifestDialog } from "@/components/hauler/CreateHaulerManifestDialog";
import { format } from "date-fns";

export default function HaulerManifests() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: haulerProfile, isLoading: profileLoading } = useHaulerProfile();
  const { data: customers } = useHaulerCustomers(haulerProfile?.id);
  const { data: dropoffs, isLoading: dropoffsLoading, refetch } = useDropoffs();

  // Filter dropoffs for this hauler's customers
  const haulerDropoffs = dropoffs?.filter((d) =>
    customers?.some((c) => c.id === d.dropoff_customer_id)
  );

  const getCustomerName = (customerId: string) => {
    const customer = customers?.find((c) => c.id === customerId);
    return customer?.company_name || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      pending: "outline",
      completed: "default",
      processing: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (profileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!haulerProfile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            No hauler profile found. Please contact support.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              My Deliveries
            </h1>
            <p className="text-muted-foreground">
              Track your tire delivery records
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Delivery
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Delivery History</CardTitle>
            <CardDescription>
              All deliveries recorded for your customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dropoffsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading deliveries...
              </div>
            ) : !haulerDropoffs || haulerDropoffs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No deliveries yet. Record your first delivery to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>PTE</TableHead>
                    <TableHead>OTR</TableHead>
                    <TableHead>Tractor</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {haulerDropoffs.map((dropoff) => {
                    const total =
                      (dropoff.pte_count || 0) +
                      (dropoff.otr_count || 0) +
                      (dropoff.tractor_count || 0);
                    return (
                      <TableRow key={dropoff.id}>
                        <TableCell>
                          {format(new Date(dropoff.dropoff_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getCustomerName(dropoff.dropoff_customer_id)}
                        </TableCell>
                        <TableCell>{dropoff.pte_count || 0}</TableCell>
                        <TableCell>{dropoff.otr_count || 0}</TableCell>
                        <TableCell>{dropoff.tractor_count || 0}</TableCell>
                        <TableCell className="font-medium">{total}</TableCell>
                        <TableCell>{getStatusBadge(dropoff.status)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateHaulerManifestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={refetch}
      />
    </AppLayout>
  );
}
