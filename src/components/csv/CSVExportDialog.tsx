import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCSVExport } from "@/hooks/useCSVExport";
import { Download } from "lucide-react";

const exportSchema = z.object({
  type: z.enum(['clients', 'pickups', 'invoices']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine((data) => {
  if (data.type === 'pickups') {
    return data.startDate && data.endDate;
  }
  return true;
}, {
  message: "Start date and end date are required for pickups export",
  path: ["startDate"]
});

type ExportData = z.infer<typeof exportSchema>;

interface CSVExportDialogProps {
  trigger?: React.ReactNode;
}

export function CSVExportDialog({ trigger }: CSVExportDialogProps) {
  const [open, setOpen] = useState(false);
  const csvExport = useCSVExport();

  const form = useForm<ExportData>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      type: 'clients',
      startDate: "",
      endDate: "",
    }
  });

  const watchedType = form.watch('type');

  const handleSubmit = async (data: ExportData) => {
    try {
      await csvExport.mutateAsync({
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Set default date range for pickups
  const setDefaultDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    form.setValue('startDate', thirtyDaysAgo.toISOString().split('T')[0]);
    form.setValue('endDate', today.toISOString().split('T')[0]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Data to CSV</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Export Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value === 'pickups') {
                        setDefaultDateRange();
                      }
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="clients">Clients</SelectItem>
                      <SelectItem value="pickups">Pickups</SelectItem>
                      <SelectItem value="invoices">Invoices</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedType === 'pickups' && (
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              {watchedType === 'clients' && 'Export all clients with their basic information, financial data, and associated pricing tiers.'}
              {watchedType === 'pickups' && 'Export pickup records within the specified date range, including client details and assignment information.'}
              {watchedType === 'invoices' && 'Export all invoices with payment status, client information, and invoice items.'}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={csvExport.isPending}>
                {csvExport.isPending ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}