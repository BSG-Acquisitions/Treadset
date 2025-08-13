import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar, MapPin, Building } from "lucide-react";

const completePickupSchema = z.object({
  pteCount: z.number().min(0, "PTE count must be 0 or greater"),
  otrCount: z.number().min(0, "OTR count must be 0 or greater"),
  tractorCount: z.number().min(0, "Tractor count must be 0 or greater"),
  notes: z.string().optional(),
});

type CompletePickupFormData = z.infer<typeof completePickupSchema>;

interface CompletePickupDialogProps {
  pickup: {
    id: string;
    client?: { company_name: string };
    location?: { name?: string; address: string };
    pickup_date: string;
    pte_count: number;
    otr_count: number;
    tractor_count: number;
    notes?: string;
    status: string;
  };
  trigger: React.ReactNode;
}

export function CompletePickupDialog({ pickup, trigger }: CompletePickupDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<CompletePickupFormData>({
    resolver: zodResolver(completePickupSchema),
    defaultValues: {
      pteCount: pickup.pte_count || 0,
      otrCount: pickup.otr_count || 0,
      tractorCount: pickup.tractor_count || 0,
      notes: pickup.notes || "",
    },
  });

  const onSubmit = async (data: CompletePickupFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('pickups')
        .update({
          pte_count: data.pteCount,
          otr_count: data.otrCount,
          tractor_count: data.tractorCount,
          notes: data.notes,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pickup.id);

      if (error) throw error;

      toast({
        title: "Pickup Completed",
        description: "Pickup information has been saved successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      setOpen(false);
    } catch (error) {
      console.error('Failed to complete pickup:', error);
      toast({
        title: "Error",
        description: "Failed to save pickup information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-brand-success" />
            Complete Pickup
          </DialogTitle>
        </DialogHeader>

        {/* Pickup Information Header */}
        <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{pickup.client?.company_name || 'Unknown Client'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{pickup.location?.name || pickup.location?.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{new Date(pickup.pickup_date).toLocaleDateString()}</span>
            <Badge variant={pickup.status === 'completed' ? 'default' : 'secondary'}>
              {pickup.status}
            </Badge>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Actual Tire Counts</h3>
              <p className="text-sm text-muted-foreground">
                Enter the actual number of tires collected during this pickup.
              </p>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pteCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PTE Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="otrCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OTR Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tractorCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tractor Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this pickup (condition, issues, etc.)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Complete Pickup"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}