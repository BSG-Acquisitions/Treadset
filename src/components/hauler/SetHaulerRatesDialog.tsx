import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSetHaulerRates, useCurrentHaulerRate } from "@/hooks/useHaulerRates";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const ratesSchema = z.object({
  pte_rate: z.number().min(0, "Rate must be 0 or greater"),
  otr_rate: z.number().min(0, "Rate must be 0 or greater"),
  tractor_rate: z.number().min(0, "Rate must be 0 or greater"),
  notes: z.string().optional(),
});

type RatesFormData = z.infer<typeof ratesSchema>;

interface SetHaulerRatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hauler: {
    id: string;
    company_name: string;
  };
}

export function SetHaulerRatesDialog({
  open,
  onOpenChange,
  hauler,
}: SetHaulerRatesDialogProps) {
  const { user } = useAuth();
  const setRates = useSetHaulerRates();
  
  const { data: currentRate } = useCurrentHaulerRate(
    user?.currentOrganization?.id || "",
    hauler.id
  );

  const form = useForm<RatesFormData>({
    resolver: zodResolver(ratesSchema),
    defaultValues: {
      pte_rate: 0,
      otr_rate: 0,
      tractor_rate: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (currentRate) {
      form.reset({
        pte_rate: Number(currentRate.pte_rate),
        otr_rate: Number(currentRate.otr_rate),
        tractor_rate: Number(currentRate.tractor_rate),
        notes: currentRate.notes || "",
      });
    }
  }, [currentRate, form]);

  const onSubmit = async (data: RatesFormData) => {
    if (!user?.currentOrganization?.id) return;

    await setRates.mutateAsync({
      organization_id: user.currentOrganization.id,
      hauler_id: hauler.id,
      pte_rate: data.pte_rate,
      otr_rate: data.otr_rate,
      tractor_rate: data.tractor_rate,
      notes: data.notes,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Hauler Rates</DialogTitle>
          <DialogDescription>
            Set the rates you'll charge {hauler.company_name} for tire drop-offs. These
            are the prices they pay to your facility.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pte_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PTE Rate (per tire)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Price per Pneumatic Tire Equivalent
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="otr_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OTR Rate (per tire)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Price per Off-The-Road tire
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tractor_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tractor Rate (per tire)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Price per tractor tire
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={setRates.isPending}>
                {setRates.isPending ? "Saving..." : "Save Rates"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
