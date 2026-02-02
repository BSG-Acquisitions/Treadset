import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDriverSchedulePickup } from "@/hooks/useDriverSchedulePickup";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const quickScheduleSchema = z.object({
  pickup_date: z.date({ required_error: "Please select a pickup date" }),
  preferred_window: z.string().optional(),
  pte_count: z.number().min(0).default(0),
  otr_count: z.number().min(0).default(0),
  tractor_count: z.number().min(0).default(0),
  notes: z.string().optional(),
});

type QuickScheduleFormData = z.infer<typeof quickScheduleSchema>;

interface QuickScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientAddress: string;
  defaultDate?: Date;
  onSuccess?: () => void;
}

export function QuickScheduleDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  clientAddress,
  defaultDate,
  onSuccess,
}: QuickScheduleDialogProps) {
  const { toast } = useToast();
  const schedulePickup = useDriverSchedulePickup();

  const form = useForm<QuickScheduleFormData>({
    resolver: zodResolver(quickScheduleSchema),
    defaultValues: {
      pickup_date: defaultDate || new Date(),
      preferred_window: "",
      pte_count: 0,
      otr_count: 0,
      tractor_count: 0,
      notes: "",
    },
  });

  // Reset form when dialog opens with new default date
  useState(() => {
    if (open && defaultDate) {
      form.setValue("pickup_date", defaultDate);
    }
  });

  const onSubmit = async (data: QuickScheduleFormData) => {
    try {
      const mapPreferredWindow = (window: string): 'AM' | 'PM' | 'Any' => {
        if (window.includes('8:00 AM - 12:00 PM')) return 'AM';
        if (window.includes('12:00 PM - 4:00 PM') || window.includes('4:00 PM - 6:00 PM')) return 'PM';
        return 'Any';
      };

      await schedulePickup.mutateAsync({
        clientId,
        pickupDate: format(data.pickup_date, 'yyyy-MM-dd'),
        preferredWindow: data.preferred_window ? mapPreferredWindow(data.preferred_window) : 'Any',
        pteCount: data.pte_count,
        otrCount: data.otr_count,
        tractorCount: data.tractor_count,
        notes: data.notes,
      });

      toast({
        title: "Pickup Scheduled",
        description: `Pickup scheduled for ${clientName}`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error scheduling pickup:', error);
      toast({
        title: "Error",
        description: "Failed to schedule pickup. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Schedule Pickup</DialogTitle>
          <DialogDescription>
            Schedule a pickup for {clientName}
          </DialogDescription>
        </DialogHeader>

        {/* Client Info Card */}
        <div className="p-3 bg-muted rounded-lg mb-2">
          <div className="font-medium text-sm">{clientName}</div>
          {clientAddress && (
            <div className="flex items-start gap-2 mt-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{clientAddress}</span>
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Pickup Date */}
            <FormField
              control={form.control}
              name="pickup_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Pickup Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preferred Time Window */}
            <FormField
              control={form.control}
              name="preferred_window"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Time</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Any time (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="8:00 AM - 12:00 PM">Morning</SelectItem>
                      <SelectItem value="12:00 PM - 4:00 PM">Afternoon</SelectItem>
                      <SelectItem value="Anytime">Anytime</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tire Counts */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="pte_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">PTE</FormLabel>
                    <FormControl>
                      <NumericInput
                        min={0}
                        value={field.value}
                        onChange={field.onChange}
                        className="text-center"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="otr_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">OTR</FormLabel>
                    <FormControl>
                      <NumericInput
                        min={0}
                        value={field.value}
                        onChange={field.onChange}
                        className="text-center"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tractor_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Tractor</FormLabel>
                    <FormControl>
                      <NumericInput
                        min={0}
                        value={field.value}
                        onChange={field.onChange}
                        className="text-center"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special instructions..."
                      className="resize-none h-16"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={schedulePickup.isPending}
                className="flex-1"
              >
                {schedulePickup.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
