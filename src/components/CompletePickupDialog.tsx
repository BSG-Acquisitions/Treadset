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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Calendar, MapPin, Building, DollarSign, Weight } from "lucide-react";

const completePickupSchema = z.object({
  // Passenger tire equipment
  pte_off_rim: z.number().min(0, "PTE off rim count must be 0 or greater"),
  pte_on_rim: z.number().min(0, "PTE on rim count must be 0 or greater"),
  
  // Commercial tires
  commercial_17_5_19_5_off: z.number().min(0, "Commercial 17.5/19.5 off rim count must be 0 or greater"),
  commercial_17_5_19_5_on: z.number().min(0, "Commercial 17.5/19.5 on rim count must be 0 or greater"),
  commercial_22_5_off: z.number().min(0, "Commercial 22.5 off rim count must be 0 or greater"),
  commercial_22_5_on: z.number().min(0, "Commercial 22.5 on rim count must be 0 or greater"),
  
  // Other categories
  otr_count: z.number().min(0, "OTR count must be 0 or greater"),
  tractor_count: z.number().min(0, "Tractor count must be 0 or greater"),
  
  // Measurements
  weight_tons: z.number().min(0, "Weight must be 0 or greater").optional(),
  volume_yards: z.number().min(0, "Volume must be 0 or greater").optional(),
  
  // Pricing overrides
  custom_pricing: z.boolean().optional(),
  unit_price_pte: z.number().min(0).optional(),
  unit_price_commercial: z.number().min(0).optional(),
  unit_price_otr: z.number().min(0).optional(),
  unit_price_tractor: z.number().min(0).optional(),
  
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
      pte_off_rim: 0,
      pte_on_rim: 0,
      commercial_17_5_19_5_off: 0,
      commercial_17_5_19_5_on: 0,
      commercial_22_5_off: 0,
      commercial_22_5_on: 0,
      otr_count: pickup.otr_count || 0,
      tractor_count: pickup.tractor_count || 0,
      weight_tons: 0,
      volume_yards: 0,
      custom_pricing: false,
      unit_price_pte: 25,
      unit_price_commercial: 35,
      unit_price_otr: 45,
      unit_price_tractor: 35,
      notes: pickup.notes || "",
    },
  });

  const customPricing = form.watch("custom_pricing");

  const onSubmit = async (data: CompletePickupFormData) => {
    setIsSubmitting(true);
    try {
      // Calculate total PTE count for compatibility
      const totalPte = data.pte_off_rim + data.pte_on_rim;
      
      const { error } = await supabase
        .from('pickups')
        .update({
          pte_count: totalPte,
          otr_count: data.otr_count,
          tractor_count: data.tractor_count,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
            {/* Passenger Tire Equipment */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <span>🚗</span> Passenger Tire Equipment (PTE)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pte_off_rim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PTE Off Rim</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pte_on_rim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PTE On Rim</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Commercial Tires */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <span>🚛</span> Commercial Tires
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="commercial_17_5_19_5_off"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>17.5/19.5 Off Rim</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="commercial_17_5_19_5_on"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>17.5/19.5 On Rim</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="commercial_22_5_off"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>22.5 Off Rim</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="commercial_22_5_on"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>22.5 On Rim</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Other Tire Types */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <span>🏗️</span> Other Tire Types
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="otr_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OTR (Off-the-Road)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
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
                      <FormLabel>Tractor Tires</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Measurements */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Weight className="h-5 w-5" />
                Measurements
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight_tons"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (Tons)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="volume_yards"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume (Cubic Yards)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Custom Pricing */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Custom Pricing
                </h3>
                <FormField
                  control={form.control}
                  name="custom_pricing"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Override default pricing</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {customPricing && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/10 rounded-lg">
                  <FormField
                    control={form.control}
                    name="unit_price_pte"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PTE Unit Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit_price_commercial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commercial Unit Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit_price_otr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OTR Unit Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit_price_tractor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tractor Unit Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes & Observations</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this pickup (tire condition, access issues, special circumstances, etc.)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-brand-success hover:bg-brand-success/90">
                {isSubmitting ? "Saving..." : "Complete Pickup"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
