import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useUpdateAssignmentStatus } from "@/hooks/useDriverWorkflow";
import { CollectPaymentDialog } from "@/components/driver/CollectPaymentDialog";
import { Upload, Camera, CreditCard, Check, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const completeAssignmentSchema = z.object({
  actualPteCount: z.number().min(0, "PTE count must be 0 or greater"),
  actualOtrCount: z.number().min(0, "OTR count must be 0 or greater"),
  actualTractorCount: z.number().min(0, "Tractor count must be 0 or greater"),
  calculatedGrossWeight: z.number().min(0, "Gross weight must be 0 or greater"),
  manifestUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type CompleteAssignmentData = z.infer<typeof completeAssignmentSchema>;

interface CompleteAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: any;
}

export function CompleteAssignmentDialog({ 
  open, 
  onOpenChange, 
  assignment 
}: CompleteAssignmentDialogProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isPickupCompleted, setIsPickupCompleted] = useState(false);
  const [showRateSelector, setShowRateSelector] = useState(false);
  const [pteRate, setPteRate] = useState<string>("");
  const [commercialRate, setCommercialRate] = useState<string>("");
  const [otrRate, setOtrRate] = useState<string>("");
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [isCalculatingPayment, setIsCalculatingPayment] = useState(false);
  const updateStatus = useUpdateAssignmentStatus();

  const PRESET_RATES = {
    passenger: ['2.50', '2.75', '3.00', '3.25'], // unchanged
    commercial: ['10.00', '11.00', '12.00', '13.00', '14.00', '15.00', '16.00', '17.00', '18.00', '19.00', '20.00'],
    otr: ['50.00', '70.00', '90.00', '110.00', '130.00', '150.00']
  };

  // Simplified weight calculations: 1 PTE = 22.47 lbs, 1 Truck = 5 PTE, 1 OTR = 15 PTE, 1 Tractor = 15 PTE
  const TIRE_WEIGHTS = {
    PTE: 22.47, // lbs per tire (1 PTE)
    OTR: 337.05, // lbs per tire (15 PTE)
    TRACTOR: 337.05, // lbs per tire (15 PTE)
  };

  const form = useForm<CompleteAssignmentData>({
    resolver: zodResolver(completeAssignmentSchema),
    defaultValues: {
      actualPteCount: assignment?.pickup?.pte_count || 0,
      actualOtrCount: assignment?.pickup?.otr_count || 0,
      actualTractorCount: assignment?.pickup?.tractor_count || 0,
      calculatedGrossWeight: 0,
      manifestUrl: "",
      notes: "",
    },
  });

  // Calculate gross weight in real-time
  const watchedValues = form.watch();
  const calculatedGrossWeight = 
    (watchedValues.actualPteCount * TIRE_WEIGHTS.PTE) +
    (watchedValues.actualOtrCount * TIRE_WEIGHTS.OTR) +
    (watchedValues.actualTractorCount * TIRE_WEIGHTS.TRACTOR);

  // Debug logging
  console.log('Weight Calculation Debug:', {
    pte: `${watchedValues.actualPteCount} × ${TIRE_WEIGHTS.PTE} = ${watchedValues.actualPteCount * TIRE_WEIGHTS.PTE}`,
    otr: `${watchedValues.actualOtrCount} × ${TIRE_WEIGHTS.OTR} = ${watchedValues.actualOtrCount * TIRE_WEIGHTS.OTR}`,
    tractor: `${watchedValues.actualTractorCount} × ${TIRE_WEIGHTS.TRACTOR} = ${watchedValues.actualTractorCount * TIRE_WEIGHTS.TRACTOR}`,
    total: calculatedGrossWeight
  });

  // Auto-update gross weight when tire counts change
  useEffect(() => {
    form.setValue("calculatedGrossWeight", calculatedGrossWeight);
  }, [calculatedGrossWeight, form]);

  // Calculate total when rates change
  useEffect(() => {
    const pte = form.watch('actualPteCount') || 0;
    const commercial = form.watch('actualTractorCount') || 0;
    const otr = form.watch('actualOtrCount') || 0;

    const pteAmount = pte * (parseFloat(pteRate) || 0);
    const commercialAmount = commercial * (parseFloat(commercialRate) || 0);
    const otrAmount = otr * (parseFloat(otrRate) || 0);

    setCalculatedTotal(pteAmount + commercialAmount + otrAmount);
  }, [pteRate, commercialRate, otrRate, form]);

  const handleSubmit = async (data: CompleteAssignmentData) => {
    try {
      await updateStatus.mutateAsync({
        assignmentId: assignment.id,
        status: 'completed',
        completionData: {
          actualCounts: {
            pte: data.actualPteCount,
            otr: data.actualOtrCount,
            tractor: data.actualTractorCount,
          },
          manifestUrl: data.manifestUrl || null,
          notes: data.notes || null,
          photos: photos.length > 0 ? photos : null,
        }
      });
      
      // Mark as completed and show rate selector
      setIsPickupCompleted(true);
      setShowRateSelector(true);
    } catch (error) {
      console.error('Error completing assignment:', error);
    }
  };

  const handleCollectPayment = async () => {
    if (calculatedTotal <= 0) return;

    setIsCalculatingPayment(true);
    try {
      // Update the pickup with computed_revenue
      const { error } = await supabase
        .from('pickups')
        .update({ computed_revenue: calculatedTotal })
        .eq('id', assignment.pickup_id);

      if (error) throw error;

      // Open payment dialog
      setShowPaymentDialog(true);
    } catch (error) {
      console.error('Failed to update revenue:', error);
    } finally {
      setIsCalculatingPayment(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Pickup</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Final Counts</h4>
              
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="actualPteCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">PTE</FormLabel>
                       <FormControl>
                         <NumericInput
                           min={0}
                           value={field.value}
                           onChange={field.onChange}
                         />
                       </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actualOtrCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">OTR</FormLabel>
                       <FormControl>
                         <NumericInput
                           min={0}
                           value={field.value}
                           onChange={field.onChange}
                         />
                       </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actualTractorCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tractor</FormLabel>
                       <FormControl>
                         <NumericInput
                           min={0}
                           value={field.value}
                           onChange={field.onChange}
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
              name="manifestUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manifest URL (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="url"
                      placeholder="https://..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Photos (Optional)</label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Add Photos
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-16 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any issues, observations, or additional notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Weight Summary - Bottom of Form */}
            <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">Calculated Gross Weight:</span>
                <span className="text-lg font-bold text-brand-primary">{calculatedGrossWeight.toFixed(1)} lbs</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">Weight in Tons:</span>
                <span className="text-sm font-semibold text-brand-secondary">{(calculatedGrossWeight / 2000).toFixed(2)} tons</span>
              </div>
              <p className="text-xs text-muted-foreground">
                PTE: {watchedValues.actualPteCount} × 22.47 lbs + OTR: {watchedValues.actualOtrCount} × 337.05 lbs + Tractor: {watchedValues.actualTractorCount} × 337.05 lbs
              </p>
            </div>


            {isPickupCompleted && showRateSelector ? (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Pickup Completed!</h3>
                  <p className="text-muted-foreground">
                    Now set the rates for payment calculation
                  </p>
                </div>

                <div className="space-y-4">
                  {form.watch('actualPteCount') > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Passenger Tire Rate ({form.watch('actualPteCount')} tires)
                      </label>
                      <Select value={pteRate} onValueChange={setPteRate}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.passenger.map((rate) => (
                            <SelectItem key={rate} value={rate}>
                              ${rate} per tire
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">or</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter custom rate"
                          value={pteRate}
                          onChange={(e) => setPteRate(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {form.watch('actualTractorCount') > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Commercial Tire Rate ({form.watch('actualTractorCount')} tires)
                      </label>
                      <Select value={commercialRate} onValueChange={setCommercialRate}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.commercial.map((rate) => (
                            <SelectItem key={rate} value={rate}>
                              ${rate} per tire
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">or</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter custom rate"
                          value={commercialRate}
                          onChange={(e) => setCommercialRate(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {form.watch('actualOtrCount') > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        OTR Tire Rate ({form.watch('actualOtrCount')} tires)
                      </label>
                      <Select value={otrRate} onValueChange={setOtrRate}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.otr.map((rate) => (
                            <SelectItem key={rate} value={rate}>
                              ${rate} per tire
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">or</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter custom rate"
                          value={otrRate}
                          onChange={(e) => setOtrRate(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {calculatedTotal > 0 && (
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Amount:</span>
                        <span className="text-2xl font-bold">${calculatedTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      form.reset();
                      setPhotos([]);
                      setIsPickupCompleted(false);
                      setShowRateSelector(false);
                      setPteRate("");
                      setCommercialRate("");
                      setOtrRate("");
                    }}
                    className="flex-1"
                  >
                    Done
                  </Button>
                  <Button
                    onClick={handleCollectPayment}
                    disabled={calculatedTotal <= 0 || isCalculatingPayment}
                    className="flex-1"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    {isCalculatingPayment ? "Processing..." : "Collect Payment"}
                  </Button>
                </div>
              </div>
            ) : !isPickupCompleted ? (
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStatus.isPending}>
                  {updateStatus.isPending ? "Completing..." : "Complete Pickup"}
                </Button>
              </div>
            ) : null}

            {/* Auto-actions info */}
            <div className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded-lg">
              <p className="font-medium mb-1">📧 Automatic Actions:</p>
              <ul className="space-y-1">
                <li>• Manifest email will be sent to client (if available)</li>
                <li>• Followup workflow will be scheduled (30 days)</li>
                <li>• Client history will be updated</li>
              </ul>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Payment Collection Dialog */}
      {assignment?.pickup && (
        <CollectPaymentDialog
          open={showPaymentDialog}
          onOpenChange={(open) => {
            setShowPaymentDialog(open);
            if (!open) {
              // Close main dialog after payment flow
              onOpenChange(false);
              form.reset();
              setPhotos([]);
              setIsPickupCompleted(false);
              setShowRateSelector(false);
              setPteRate("");
              setCommercialRate("");
              setOtrRate("");
            }
          }}
          pickupId={assignment.pickup_id}
          amount={calculatedTotal}
          clientName={assignment.pickup?.clients?.company_name || 'Customer'}
        />
      )}
    </Dialog>
  );
}