import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreateManifest } from "@/hooks/useManifests";
import { useManifestIntegration } from "@/hooks/useManifestIntegration";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building, 
  MapPin, 
  Truck, 
  Package, 
  Camera, 
  FileCheck,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

// Validation schema
const manifestSchema = z.object({
  // Generator Info (Part 1)
  generator_company_name: z.string().min(1, "Company name is required").max(100),
  generator_street_address: z.string().min(1, "Street address is required").max(200),
  generator_city: z.string().min(1, "City is required").max(100),
  generator_state: z.string().length(2, "State must be 2 characters"),
  generator_zip: z.string().min(5, "ZIP code is required").max(10),
  generator_phone: z.string().max(20).optional(),
  generator_email: z.string().email().optional().or(z.literal("")),
  generator_contact_person: z.string().max(100).optional(),
  generator_signature_printed_name: z.string().max(100).optional(),
  
  // Hauler Info (Part 2)
  hauler_company_name: z.string().min(1, "Hauler company name is required").max(100),
  hauler_street_address: z.string().max(200).optional(),
  hauler_city: z.string().max(100).optional(),
  hauler_state: z.string().max(2).optional(),
  hauler_zip: z.string().max(10).optional(),
  hauler_phone: z.string().max(20).optional(),
  hauler_drivers_license: z.string().max(50).optional(),
  hauler_vehicle_license_plate: z.string().max(20).optional(),
  hauler_signature_printed_name: z.string().max(100).optional(),
  
  // Receiver Info (Part 3)
  receiver_company_name: z.string().min(1, "Receiver company name is required").max(100),
  receiver_street_address: z.string().max(200).optional(),
  receiver_city: z.string().max(100).optional(),
  receiver_state: z.string().max(2).optional(),
  receiver_zip: z.string().max(10).optional(),
  receiver_phone: z.string().max(20).optional(),
  receiver_signature_printed_name: z.string().max(100).optional(),
  
  // Tire Counts
  passenger_count: z.number().int().min(0).optional(),
  passenger_rim_count: z.number().int().min(0).optional(),
  truck_count: z.number().int().min(0).optional(),
  truck_rim_count: z.number().int().min(0).optional(),
  off_road_count: z.number().int().min(0).optional(),
  off_road_rim_count: z.number().int().min(0).optional(),
  
  // Pricing
  passenger_unit_price: z.number().min(0).optional(),
  truck_unit_price: z.number().min(0).optional(),
  off_road_unit_price: z.number().min(0).optional(),
  
  // Notes
  special_notes: z.string().max(500).optional(),
});

type ManifestFormData = z.infer<typeof manifestSchema>;

interface DriverManifestCreationWizardProps {
  pickupId?: string;
  clientId?: string;
  pickup?: any; // Full pickup data for pre-population
  onComplete?: () => void;
}

const steps = [
  { key: "generator", title: "Generator Info", icon: Building },
  { key: "hauler", title: "Hauler Info", icon: Truck },
  { key: "receiver", title: "Receiver Info", icon: MapPin },
  { key: "tires", title: "Tire Counts", icon: Package },
  { key: "review", title: "Review", icon: FileCheck },
];

export function DriverManifestCreationWizard({ 
  pickupId, 
  clientId,
  pickup,
  onComplete 
}: DriverManifestCreationWizardProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const createManifest = useCreateManifest();
  const manifestIntegration = useManifestIntegration();

  const form = useForm<ManifestFormData>({
    resolver: zodResolver(manifestSchema),
    defaultValues: {
      // Pre-populate generator from client data
      generator_company_name: pickup?.client?.company_name || "",
      generator_street_address: pickup?.client?.physical_address || pickup?.client?.mailing_address || pickup?.location?.address || "",
      generator_city: pickup?.client?.physical_city || pickup?.client?.city || "",
      generator_state: pickup?.client?.physical_state || pickup?.client?.state || "MI",
      generator_zip: pickup?.client?.physical_zip || pickup?.client?.zip || "",
      generator_phone: pickup?.client?.phone || "",
      generator_email: pickup?.client?.email || "",
      generator_contact_person: pickup?.client?.contact_name || "",
      
      // Hauler defaults
      hauler_state: "MI",
      
      // Receiver defaults
      receiver_state: "MI",
      
      // Tire counts from pickup
      passenger_count: 0,
      passenger_rim_count: 0,
      truck_count: 0,
      truck_rim_count: 0,
      off_road_count: 0,
      off_road_rim_count: 0,
      
      // Pricing
      passenger_unit_price: 0,
      truck_unit_price: 0,
      off_road_unit_price: 0,
    },
  });

  // Scroll to top on step change
  useEffect(() => {
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step, isMobile]);

  // Handle input focus on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, [isMobile]);

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  const handleNext = async () => {
    let fieldsToValidate: (keyof ManifestFormData)[] = [];
    
    switch (currentStep.key) {
      case "generator":
        fieldsToValidate = [
          "generator_company_name",
          "generator_street_address",
          "generator_city",
          "generator_state",
          "generator_zip",
        ];
        break;
      case "hauler":
        fieldsToValidate = ["hauler_company_name"];
        break;
      case "receiver":
        fieldsToValidate = ["receiver_company_name"];
        break;
      case "tires":
        // No required fields, just validate they entered some counts
        const counts = form.getValues();
        const totalCount = (counts.passenger_count || 0) + 
                          (counts.passenger_rim_count || 0) +
                          (counts.truck_count || 0) + 
                          (counts.truck_rim_count || 0) +
                          (counts.off_road_count || 0) + 
                          (counts.off_road_rim_count || 0);
        
        if (totalCount === 0) {
          toast({
            title: "Missing Information",
            description: "Please enter at least one tire count",
            variant: "destructive",
          });
          return;
        }
        break;
    }

    if (fieldsToValidate.length > 0) {
      const result = await form.trigger(fieldsToValidate);
      if (!result) return;
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const onSubmit = async (data: ManifestFormData) => {
    setIsSubmitting(true);
    
    try {
      // Map form data to manifest tire counts
      // passenger -> pte
      // truck -> commercial_22_5
      // off_road -> otr
      const manifestData = {
        pickup_id: pickupId || null,
        client_id: clientId || null,
        status: "DRAFT" as const,
        pte_off_rim: data.passenger_count || 0,
        pte_on_rim: data.passenger_rim_count || 0,
        commercial_22_5_off: data.truck_count || 0,
        commercial_22_5_on: data.truck_rim_count || 0,
        otr_count: (data.off_road_count || 0) + (data.off_road_rim_count || 0),
        payment_method: 'INVOICE' as const,
      };
      
      // Create manifest
      const manifestResult = await createManifest.mutateAsync(manifestData);
      
      // Update with AcroForm data using raw SQL since the type doesn't include these fields
      const { error: updateError } = await supabase
        .from('manifests')
        .update({
          generator_company_name: data.generator_company_name,
          generator_street_address: data.generator_street_address,
          generator_city: data.generator_city,
          generator_state: data.generator_state,
          generator_zip: data.generator_zip,
          generator_phone: data.generator_phone,
          generator_email: data.generator_email,
          generator_contact_person: data.generator_contact_person,
          generator_signature_printed_name: data.generator_signature_printed_name,
          hauler_company_name: data.hauler_company_name,
          hauler_street_address: data.hauler_street_address,
          hauler_city: data.hauler_city,
          hauler_state: data.hauler_state,
          hauler_zip: data.hauler_zip,
          hauler_phone: data.hauler_phone,
          hauler_drivers_license: data.hauler_drivers_license,
          hauler_vehicle_license_plate: data.hauler_vehicle_license_plate,
          hauler_signature_printed_name: data.hauler_signature_printed_name,
          receiver_company_name: data.receiver_company_name,
          receiver_street_address: data.receiver_street_address,
          receiver_city: data.receiver_city,
          receiver_state: data.receiver_state,
          receiver_zip: data.receiver_zip,
          receiver_phone: data.receiver_phone,
          receiver_signature_printed_name: data.receiver_signature_printed_name,
          passenger_unit_price: data.passenger_unit_price || 0,
          truck_unit_price: data.truck_unit_price || 0,
          off_road_unit_price: data.off_road_unit_price || 0,
          special_notes: data.special_notes,
        } as any)
        .eq('id', manifestResult.id);
      
      if (updateError) throw updateError;

      // Generate PDF
      await manifestIntegration.mutateAsync({
        manifestId: manifestResult.id,
      });

      toast({
        title: "Success",
        description: "Manifest created successfully",
      });

      if (onComplete) {
        onComplete();
      } else {
        navigate("/driver/manifests");
      }
    } catch (error) {
      console.error("Error creating manifest:", error);
      toast({
        title: "Error",
        description: "Failed to create manifest",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    const StepIcon = currentStep.icon;

    switch (currentStep.key) {
      case "generator":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <StepIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Generator Information</h3>
            </div>
            
            <FormField
              control={form.control}
              name="generator_company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter company name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="generator_street_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter street address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="generator_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="generator_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="MI" maxLength={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="generator_zip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter ZIP code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="generator_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(555) 123-4567" type="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="generator_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="email@example.com" type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="generator_contact_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter contact person name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "hauler":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <StepIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Hauler Information</h3>
            </div>

            <FormField
              control={form.control}
              name="hauler_company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter hauler company name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hauler_street_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter street address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hauler_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hauler_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="MI" maxLength={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hauler_zip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter ZIP code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hauler_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(555) 123-4567" type="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hauler_drivers_license"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver's License</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter driver's license number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hauler_vehicle_license_plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle License Plate</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter license plate" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "receiver":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <StepIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Receiver Information</h3>
            </div>

            <FormField
              control={form.control}
              name="receiver_company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter receiver company name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiver_street_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter street address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="receiver_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiver_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="MI" maxLength={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="receiver_zip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter ZIP code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiver_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(555) 123-4567" type="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "tires":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <StepIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Tire Counts & Pricing</h3>
            </div>

            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">Passenger Tires</h4>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="passenger_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Count</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
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
                    name="passenger_rim_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>With Rims</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="passenger_unit_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">Truck Tires</h4>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="truck_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Count</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
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
                    name="truck_rim_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>With Rims</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="truck_unit_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">Off-Road Tires</h4>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="off_road_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Count</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
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
                    name="off_road_rim_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>With Rims</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="off_road_unit_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
              name="special_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Add any special notes or instructions"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "review":
        const values = form.getValues();
        const totalTires = (values.passenger_count || 0) + 
                          (values.passenger_rim_count || 0) +
                          (values.truck_count || 0) + 
                          (values.truck_rim_count || 0) +
                          (values.off_road_count || 0) + 
                          (values.off_road_rim_count || 0);

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <StepIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Review & Submit</h3>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generator</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{values.generator_company_name}</p>
                <p>{values.generator_street_address}</p>
                <p>{values.generator_city}, {values.generator_state} {values.generator_zip}</p>
                {values.generator_phone && <p>Phone: {values.generator_phone}</p>}
                {values.generator_email && <p>Email: {values.generator_email}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hauler</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{values.hauler_company_name}</p>
                {values.hauler_street_address && <p>{values.hauler_street_address}</p>}
                {values.hauler_city && (
                  <p>{values.hauler_city}, {values.hauler_state} {values.hauler_zip}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receiver</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{values.receiver_company_name}</p>
                {values.receiver_street_address && <p>{values.receiver_street_address}</p>}
                {values.receiver_city && (
                  <p>{values.receiver_city}, {values.receiver_state} {values.receiver_zip}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tire Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="font-medium">Total Tires: {totalTires}</p>
                {values.passenger_count! > 0 && (
                  <p>Passenger: {values.passenger_count} ({values.passenger_rim_count} with rims)</p>
                )}
                {values.truck_count! > 0 && (
                  <p>Truck: {values.truck_count} ({values.truck_rim_count} with rims)</p>
                )}
                {values.off_road_count! > 0 && (
                  <p>Off-Road: {values.off_road_count} ({values.off_road_rim_count} with rims)</p>
                )}
              </CardContent>
            </Card>

            {values.special_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Special Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>{values.special_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const content = (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {step + 1} of {steps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {steps.map((s, i) => {
          const StepIcon = s.icon;
          return (
            <div 
              key={s.key} 
              className={`flex flex-col items-center gap-1 ${
                i === step ? 'text-primary' : i < step ? 'text-green-500' : 'text-muted-foreground'
              }`}
            >
              <div className={`rounded-full p-2 ${
                i === step ? 'bg-primary/10' : i < step ? 'bg-green-500/10' : 'bg-muted'
              }`}>
                <StepIcon className="h-4 w-4" />
              </div>
              <span className="text-xs hidden sm:block">{s.title}</span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-4 border-t">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            
            {step < steps.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Creating..." : "Create Manifest"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );

  if (isMobile) {
    return (
      <Card className="border-0 shadow-none">
        <CardContent className="p-4">
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="pr-4">
              {content}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Manifest</CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
