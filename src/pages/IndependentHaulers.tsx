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
import { Plus, Settings, FileText, DollarSign } from "lucide-react";
import { useHaulerRelationships } from "@/hooks/useHaulerRelationships";
import { useAuth } from "@/contexts/AuthContext";
import { InviteHaulerDialog } from "@/components/hauler/InviteHaulerDialog";
import { SetHaulerRatesDialog } from "@/components/hauler/SetHaulerRatesDialog";
import { format } from "date-fns";

export default function IndependentHaulers() {
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [selectedHauler, setSelectedHauler] = useState<any>(null);

  const { data: relationships, isLoading } = useHaulerRelationships(
    user?.currentOrganization?.id
  );

  const handleSetRates = (relationship: any) => {
    setSelectedHauler(relationship.hauler);
    setRatesOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Independent Haulers
            </h1>
            <p className="text-muted-foreground">
              Manage independent haulers who bring tires to your facility
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Hauler
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Haulers</CardTitle>
            <CardDescription>
              Licensed haulers who can drop off tires at your facility
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading haulers...
              </div>
            ) : !relationships || relationships.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No haulers yet. Invite your first hauler to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>DOT/License</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relationships.map((rel: any) => (
                    <TableRow key={rel.id}>
                      <TableCell className="font-medium">
                        {rel.hauler?.company_name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{rel.hauler?.email}</div>
                          {rel.hauler?.phone && (
                            <div className="text-sm text-muted-foreground">
                              {rel.hauler.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {rel.hauler?.dot_number && (
                            <div className="text-sm">
                              DOT: {rel.hauler.dot_number}
                            </div>
                          )}
                          {rel.hauler?.license_number && (
                            <div className="text-sm text-muted-foreground">
                              License: {rel.hauler.license_number}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {rel.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(rel.invited_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetRates(rel)}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <InviteHaulerDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      {selectedHauler && (
        <SetHaulerRatesDialog
          open={ratesOpen}
          onOpenChange={setRatesOpen}
          hauler={selectedHauler}
        />
      )}
    </AppLayout>
  );
}
