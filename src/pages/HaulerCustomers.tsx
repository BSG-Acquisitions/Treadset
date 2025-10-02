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
import { Plus, MapPin, Phone, Mail } from "lucide-react";
import { useHaulerProfile } from "@/hooks/useIndependentHaulers";
import { useHaulerCustomers } from "@/hooks/useHaulerCustomers";
import { CreateHaulerCustomerDialog } from "@/components/hauler/CreateHaulerCustomerDialog";
import { EditHaulerCustomerDialog } from "@/components/hauler/EditHaulerCustomerDialog";

export default function HaulerCustomers() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: haulerProfile, isLoading: profileLoading } = useHaulerProfile();
  const { data: customers, isLoading: customersLoading } = useHaulerCustomers(
    haulerProfile?.id
  );

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setEditOpen(true);
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
            <h1 className="text-3xl font-bold text-foreground">My Customers</h1>
            <p className="text-muted-foreground">
              Manage your tire generator customers
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>
              Your tire generator customers and pickup locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customersLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading customers...
              </div>
            ) : !customers || customers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No customers yet. Add your first customer to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.company_name}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.contact_name && (
                            <div className="text-sm flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.contact_name}
                            </div>
                          )}
                          {customer.email && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="text-sm text-muted-foreground">
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            {customer.address && <div>{customer.address}</div>}
                            {(customer.city || customer.state || customer.zip) && (
                              <div className="text-muted-foreground">
                                {[customer.city, customer.state, customer.zip]
                                  .filter(Boolean)
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(customer)}
                        >
                          Edit
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

      <CreateHaulerCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        haulerId={haulerProfile.id}
      />

      {selectedCustomer && (
        <EditHaulerCustomerDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          customer={selectedCustomer}
        />
      )}
    </AppLayout>
  );
}
