import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Camera, Upload, Truck, DollarSign, Calculator } from "lucide-react";

const driverPickupSchema = z.object({
  // Tire counts
  pte_off_rim: z.number().min(0, "PTE off rim count must be 0 or greater"),
  pte_on_rim: z.number().min(0, "PTE on rim count must be 0 or greater"),
  commercial_17_5_19_5_off: z.number().min(0, "Commercial 17.5/19.5 off rim count must be 0 or greater"),
  commercial_17_5_19_5_on: z.number().min(0, "Commercial 17.5/19.5 on rim count must be 0 or greater"),
  commercial_22_5_off: z.number().min(0, "Commercial 22.5 off rim count must be 0 or greater"),
  commercial_22_5_on: z.number().min(0, "Commercial 22.5 on rim count must be 0 or greater"),
  otr_count: z.number().min(0, "OTR count must be 0 or greater"),
  tractor_count: z.number().min(0, "Tractor count must be 0 or greater"),
  
  // Measurements
  weight_tons: z.number().min(0, "Weight must be 0 or greater").optional(),
  volume_yards: z.number().min(0, "Volume must be 0 or greater").optional(),
  
  // Driver notes
  driver_notes: z.string().optional(),
  condition_notes: z.string().optional(),
  access_notes: z.string().optional(),
});

type DriverPickupFormData = z.infer<typeof driverPickupSchema>;

interface DriverPickupInterfaceProps {
  pickup: {
    id: string;
    client?: { company_name: string };
    location?: { name?: string; address: string };
    pickup_date: string;
    status: string;
  };
  onComplete?: () => void;
}

export function DriverPickupInterface({ pickup, onComplete }: DriverPickupInterfaceProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load organization pricing settings
  useEffect(() => {
    const loadOrgSettings = async () => {
      const { data } = await supabase
        .from('organization_settings')
        .select('default_pte_rate, default_otr_rate, default_tractor_rate')
        .single();
      setOrgSettings(data);
    };
    loadOrgSettings();
  }, []);

  const form = useForm<DriverPickupFormData>({
    resolver: zodResolver(driverPickupSchema),
    defaultValues: {
      pte_off_rim: 0,
      pte_on_rim: 0,
      commercial_17_5_19_5_off: 0,
      commercial_17_5_19_5_on: 0,
      commercial_22_5_off: 0,
      commercial_22_5_on: 0,
      otr_count: 0,
      tractor_count: 0,
      weight_tons: 0,
      volume_yards: 0,
      driver_notes: "",
      condition_notes: "",
      access_notes: "",
    },
  });

  // Calculate total in real-time
  const watchedValues = form.watch();
  useEffect(() => {
    if (orgSettings) {
      const pteTotal = (watchedValues.pte_off_rim + watchedValues.pte_on_rim) * orgSettings.default_pte_rate;
      const commercialTotal = (
        watchedValues.commercial_17_5_19_5_off + 
        watchedValues.commercial_17_5_19_5_on + 
        watchedValues.commercial_22_5_off + 
        watchedValues.commercial_22_5_on
      ) * 35; // Commercial rate
      const otrTotal = watchedValues.otr_count * orgSettings.default_otr_rate;
      const tractorTotal = watchedValues.tractor_count * orgSettings.default_tractor_rate;
      
      setCalculatedTotal(pteTotal + commercialTotal + otrTotal + tractorTotal);
    }
  }, [watchedValues, orgSettings]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setPhotos(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: DriverPickupFormData) => {
    setIsSubmitting(true);
    try {
      // Calculate total PTE count for compatibility
      const totalPte = data.pte_off_rim + data.pte_on_rim;
      
      // Combine all notes
      const allNotes = [
        data.driver_notes,
        data.condition_notes && `Condition: ${data.condition_notes}`,
        data.access_notes && `Access: ${data.access_notes}`
      ].filter(Boolean).join(' | ');

      const { error } = await supabase
        .from('pickups')
        .update({
          pte_count: totalPte,
          otr_count: data.otr_count,
          tractor_count: data.tractor_count,
          computed_revenue: calculatedTotal,
          final_revenue: calculatedTotal,
          notes: allNotes,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pickup.id);

      if (error) throw error;

      toast({
        title: "Pickup Completed",
        description: "Great job! Pickup information has been saved successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      onComplete?.();
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
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-brand-primary" />
            Driver Pickup Completion
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Pickup Info */}
          <div className="bg-secondary/20 rounded-lg p-4 mb-6 space-y-2">
            <div className="font-medium text-lg">{pickup.client?.company_name}</div>
            <div className="text-sm text-muted-foreground">{pickup.location?.name || pickup.location?.address}</div>
            <div className="text-sm text-muted-foreground">{new Date(pickup.pickup_date).toLocaleDateString()}</div>
            <Badge variant="secondary">{pickup.status}</Badge>
          </div>

          {/* Real-time Total Calculation */}
          <Card className="bg-brand-primary/5 border-brand-primary/20 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-brand-primary" />
                  <span className="font-medium">Amount to Charge Client:</span>
                </div>
                <div className="text-2xl font-bold text-brand-primary">
                  ${calculatedTotal.toFixed(2)}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Updates automatically as you enter tire counts
              </div>
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Quick Count Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">🚗 Passenger Tires (PTE)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="pte_off_rim"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Off Rim</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            className="text-lg text-center"
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
                        <FormLabel>On Rim</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            className="text-lg text-center"
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
                <h3 className="text-lg font-medium">🚛 Commercial Tires</h3>
                <div className="space-y-3">
                  <div className="text-sm font-medium">17.5 / 19.5 Size</div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="commercial_17_5_19_5_off"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Off Rim</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              className="text-lg text-center"
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
                          <FormLabel>On Rim</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              className="text-lg text-center"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="text-sm font-medium">22.5 Size</div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="commercial_22_5_off"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Off Rim</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              className="text-lg text-center"
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
                          <FormLabel>On Rim</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              className="text-lg text-center"
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

              {/* Other Types */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">🏗️ Other Types</h3>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="otr_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OTR (Off-Road)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            className="text-lg text-center"
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
                        <FormLabel>Tractor</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            className="text-lg text-center"
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

              {/* Weight/Volume */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">📏 Measurements (Optional)</h3>
                <div className="grid grid-cols-2 gap-3">
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
                        <FormLabel>Volume (Yards³)</FormLabel>
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

              {/* Photos */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Photos
                </h3>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
                  >
                    <Upload className="h-5 w-5" />
                    Add Photos
                  </label>
                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={() => removePhoto(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">📝 Notes</h3>
                <FormField
                  control={form.control}
                  name="driver_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any general notes about the pickup..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="condition_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tire Condition</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Note the condition of tires (good, fair, poor, damaged, etc.)..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="access_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Issues</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any access issues or special instructions for future pickups..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-success hover:bg-brand-success/90 text-white text-lg py-3"
              >
                {isSubmitting ? "Saving..." : "✅ Complete Pickup"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
