import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useHaulerCustomers } from "@/hooks/useHaulerCustomers";
import { useHaulerProfile } from "@/hooks/useIndependentHaulers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  pte_count: z.coerce.number().min(0, "Must be 0 or greater"),
  otr_count: z.coerce.number().min(0, "Must be 0 or greater"),
  tractor_count: z.coerce.number().min(0, "Must be 0 or greater"),
  notes: z.string().optional(),
});

interface CreateHaulerManifestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateHaulerManifestDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateHaulerManifestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { data: haulerProfile } = useHaulerProfile();
  const { data: customers } = useHaulerCustomers(haulerProfile?.id);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: "",
      pte_count: 0,
      otr_count: 0,
      tractor_count: 0,
      notes: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!haulerProfile || !user?.currentOrganization?.id) {
      toast.error("Missing hauler or organization information");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("dropoffs").insert({
        organization_id: user.currentOrganization.id,
        hauler_id: haulerProfile.id,
        dropoff_customer_id: values.customer_id,
        dropoff_date: new Date().toISOString().split("T")[0],
        dropoff_time: new Date().toTimeString().split(" ")[0],
        pte_count: values.pte_count,
        otr_count: values.otr_count,
        tractor_count: values.tractor_count,
        status: "completed",
        payment_status: "pending",
        notes: values.notes,
      });

      if (error) throw error;

      toast.success("Delivery recorded successfully");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating delivery:", error);
      toast.error("Failed to record delivery");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Tire Delivery</DialogTitle>
          <DialogDescription>
            Record tire delivery from your customer to the facility
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer (Generator)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pte_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PTE Count</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="otr_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OTR Count</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tractor_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tractor Count</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
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
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Recording..." : "Record Delivery"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
