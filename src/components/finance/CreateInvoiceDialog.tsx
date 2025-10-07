import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompletedPickups, useCreateInvoice } from "@/hooks/useFinance";
import { useClients } from "@/hooks/useClients";
import { CalendarDays, DollarSign, FileText, MapPin } from "lucide-react";
import { getPickupAddress } from "@/lib/pickupUtils";

const createInvoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  pickupIds: z.array(z.string()).min(1, "Select at least one pickup"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
});

type CreateInvoiceData = z.infer<typeof createInvoiceSchema>;

interface CreateInvoiceDialogProps {
  trigger?: React.ReactNode;
  clientId?: string;
}

export function CreateInvoiceDialog({ trigger, clientId }: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(clientId || "");

  const { data: clients } = useClients({ limit: 100 });
  const { data: completedPickups = [] } = useCompletedPickups(selectedClient);
  const createInvoice = useCreateInvoice();

  const form = useForm<CreateInvoiceData>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      clientId: clientId || "",
      pickupIds: [],
      dueDate: "",
      notes: "",
    },
  });

  const watchedPickupIds = form.watch("pickupIds");
  
  // Calculate totals for selected pickups
  const selectedPickups = completedPickups.filter(pickup => 
    watchedPickupIds.includes(pickup.id)
  );
  const subtotal = selectedPickups.reduce((sum, pickup) => sum + (pickup.computed_revenue || 0), 0);
  const taxAmount = subtotal * 0.0825; // 8.25% tax
  const total = subtotal + taxAmount;

  const handleSubmit = async (data: CreateInvoiceData) => {
    try {
      // Set due date to 30 days from now if not specified
      if (!data.dueDate) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        data.dueDate = dueDate.toISOString().split('T')[0];
      }

      await createInvoice.mutateAsync({
        clientId: data.clientId,
        pickupIds: data.pickupIds,
        dueDate: data.dueDate,
        notes: data.notes
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
    form.setValue("clientId", clientId);
    form.setValue("pickupIds", []); // Reset selected pickups when client changes
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Client Selection */}
            {!clientId && (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <Select onValueChange={handleClientChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.data?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Pickup Selection */}
            {selectedClient && (
              <FormField
                control={form.control}
                name="pickupIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Completed Pickups *</FormLabel>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {completedPickups.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No completed pickups available for invoicing.
                        </p>
                      ) : (
                        completedPickups.map((pickup) => (
                          <Card key={pickup.id} className="p-3">
                            <div className="flex items-start space-x-3">
                              <FormField
                                control={form.control}
                                name="pickupIds"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(pickup.id)}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          if (checked) {
                                            field.onChange([...currentValue, pickup.id]);
                                          } else {
                                            field.onChange(
                                              currentValue.filter((id) => id !== pickup.id)
                                            );
                                          }
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {new Date(pickup.pickup_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      ${(pickup.computed_revenue || 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                
                                {pickup.client && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      {getPickupAddress(pickup)}
                                    </span>
                                  </div>
                                )}
                                
                                <div className="flex gap-2">
                                  <Badge variant="secondary">PTE: {pickup.pte_count}</Badge>
                                  <Badge variant="secondary">OTR: {pickup.otr_count}</Badge>
                                  <Badge variant="secondary">Tractor: {pickup.tractor_count}</Badge>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Invoice Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes for the invoice..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Invoice Summary */}
            {selectedPickups.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (8.25%):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createInvoice.isPending || selectedPickups.length === 0}
              >
                {createInvoice.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}