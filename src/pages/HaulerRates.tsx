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
import { Plus, DollarSign } from "lucide-react";
import { useHaulers } from "@/hooks/useHaulers";
import { useHaulerRates } from "@/hooks/useHaulerRates";
import { useAuth } from "@/contexts/AuthContext";
import { SetHaulerRatesDialog } from "@/components/hauler/SetHaulerRatesDialog";
import { format } from "date-fns";

export default function HaulerRates() {
  const [selectedHauler, setSelectedHauler] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { data: haulers, isLoading: haulersLoading } = useHaulers();
  const { data: allRates, isLoading: ratesLoading } = useHaulerRates(
    user?.currentOrganization?.id
  );

  const handleSetRates = (hauler: any) => {
    setSelectedHauler(hauler);
    setDialogOpen(true);
  };

  const getHaulerCurrentRate = (haulerId: string) => {
    if (!allRates) return null;
    return allRates.find(
      (rate) =>
        rate.hauler_id === haulerId &&
        (!rate.effective_to || new Date(rate.effective_to) > new Date())
    );
  };

  if (haulersLoading || ratesLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Hauler Rates</h1>
            <p className="text-muted-foreground">
              Manage pricing rates for independent haulers
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rate Configuration</CardTitle>
            <CardDescription>
              Set custom rates for each hauler or use organization defaults
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!haulers || haulers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No haulers available. Add haulers first to configure rates.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hauler</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>PTE Rate</TableHead>
                    <TableHead>OTR Rate</TableHead>
                    <TableHead>Tractor Rate</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {haulers.map((hauler) => {
                    const currentRate = getHaulerCurrentRate(hauler.id);
                    return (
                      <TableRow key={hauler.id}>
                        <TableCell className="font-medium">
                          {hauler.company_name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {hauler.city && hauler.state
                              ? `${hauler.city}, ${hauler.state}`
                              : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {currentRate ? (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {currentRate.pte_rate}
                            </span>
                          ) : (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {currentRate ? (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {currentRate.otr_rate}
                            </span>
                          ) : (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {currentRate ? (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {currentRate.tractor_rate}
                            </span>
                          ) : (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {currentRate?.effective_from ? (
                            <span className="text-sm">
                              {format(
                                new Date(currentRate.effective_from),
                                "MMM d, yyyy"
                              )}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              N/A
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetRates(hauler)}
                          >
                            {currentRate ? "Update" : "Set"} Rates
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedHauler && (
        <SetHaulerRatesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          hauler={selectedHauler}
        />
      )}
    </AppLayout>
  );
}
