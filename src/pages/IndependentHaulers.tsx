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
import { useHaulers } from "@/hooks/useHaulers";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function IndependentHaulers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedHauler, setSelectedHauler] = useState<any>(null);

  const { data: haulers, isLoading } = useHaulers();

  const handleViewDetails = (hauler: any) => {
    setSelectedHauler(hauler);
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/hauler-rates")}>
              <DollarSign className="h-4 w-4 mr-2" />
              Manage Rates
            </Button>
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Hauler
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Haulers</CardTitle>
            <CardDescription>
              Licensed haulers in your system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading haulers...
              </div>
            ) : !haulers || haulers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No haulers yet. Add your first hauler to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Michigan Registration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {haulers.map((hauler: any) => (
                    <TableRow key={hauler.id}>
                      <TableCell className="font-medium">
                        {hauler.company_name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {hauler.email && (
                            <div className="text-sm">{hauler.email}</div>
                          )}
                          {hauler.phone && (
                            <div className="text-sm text-muted-foreground">
                              {hauler.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hauler.hauler_mi_reg || "N/A"}
                      </TableCell>
                      <TableCell>
                        {hauler.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(hauler.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(hauler)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

    </AppLayout>
  );
}
