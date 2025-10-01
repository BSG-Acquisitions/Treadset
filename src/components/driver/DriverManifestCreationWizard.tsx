import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateManifest, useUpdateManifest } from "@/hooks/useManifests";
import { useManifestIntegration } from "@/hooks/useManifestIntegration";
import { useSendManifestEmail } from "@/hooks/useSendManifestEmail";
import { useHaulers } from "@/hooks/useHaulers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SignatureCanvas from "react-signature-canvas";
import { pteToTons, MICHIGAN_CONVERSIONS } from "@/lib/michigan-conversions";
import { 
  Building, 
  Truck, 
  Package, 
  ChevronRight,
  ChevronLeft,
  PenTool,
  CheckCircle
} from "lucide-react";

// Validation schema - tire counts, printed names, and optional weights
const manifestSchema = z.object({
  pte_off_rim: z.coerce.number().min(0).default(0),
  pte_on_rim: z.coerce.number().min(0).default(0),
  commercial_17_5_19_5_off: z.coerce.number().min(0).default(0),
  commercial_17_5_19_5_on: z.coerce.number().min(0).default(0),
  commercial_22_5_off: z.coerce.number().min(0).default(0),
  commercial_22_5_on: z.coerce.number().min(0).default(0),
  otr_count: z.coerce.number().min(0).default(0),
  tractor_count: z.coerce.number().min(0).default(0),
  // Optional weights
  gross_weight_lbs: z.coerce.number().min(0).optional().default(0),
  tare_weight_lbs: z.coerce.number().min(0).optional().default(0),
  weight_tons_manual: z.coerce.number().min(0).optional().default(0),
  generator_print_name: z.string().min(1, "Generator printed name required"),
  hauler_print_name: z.string().min(1, "Hauler printed name required"),
});

type ManifestFormData = z.infer<typeof manifestSchema>;

interface DriverManifestCreationWizardProps {
  pickupId: string;
  clientId: string;
  onComplete?: () => void;
}

const steps = [
  { key: "info", title: "Review Info", icon: Building },
  { key: "tires", title: "Tire Counts", icon: Package },
  { key: "signatures", title: "Signatures", icon: PenTool },
  { key: "review", title: "Review & Submit", icon: CheckCircle },
];

export function DriverManifestCreationWizard({ 
  pickupId, 
  clientId,
  onComplete 
}: DriverManifestCreationWizardProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickupData, setPickupData] = useState<any>(null);
  const [haulerData, setHaulerData] = useState<any>(null);
  const [assignmentData, setAssignmentData] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [manualWeightOverride, setManualWeightOverride] = useState<boolean>(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const createManifest = useCreateManifest({ toastOnSuccess: false });
  const updateManifest = useUpdateManifest();
  const manifestIntegration = useManifestIntegration();
  const sendEmail = useSendManifestEmail();
  const { data: haulers = [] } = useHaulers();

  // Signature refs
  const generatorSigRef = useRef<SignatureCanvas>(null);
  const haulerSigRef = useRef<SignatureCanvas>(null);
  const [genSigPath, setGenSigPath] = useState<string>('');
  const [haulSigPath, setHaulSigPath] = useState<string>('');
  const form = useForm<ManifestFormData>({
    resolver: zodResolver(manifestSchema),
    mode: "onChange",
defaultValues: {
  pte_off_rim: 0,
  pte_on_rim: 0,
  commercial_17_5_19_5_off: 0,
  commercial_17_5_19_5_on: 0,
  commercial_22_5_off: 0,
  commercial_22_5_on: 0,
  otr_count: 0,
  tractor_count: 0,
  gross_weight_lbs: 0,
  tare_weight_lbs: 0,
  weight_tons_manual: 0,
  generator_print_name: "",
hauler_print_name: "",
    },
  });

  // Helpers for PTE and weight calculations (Michigan rule: 89 PTE = 1 ton)
  const computeTotalPTE = (vals: ManifestFormData) => {
    const passenger = ((vals.pte_off_rim || 0) + (vals.pte_on_rim || 0)) * MICHIGAN_CONVERSIONS.PASSENGER_TIRE_TO_PTE;
    const truckCount = (vals.commercial_17_5_19_5_off || 0) + (vals.commercial_17_5_19_5_on || 0) + (vals.commercial_22_5_off || 0) + (vals.commercial_22_5_on || 0);
    const truck = truckCount * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;
    const tractor = (vals.tractor_count || 0) * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE; // Tractor tires = semi tires (5 PTE)
    const otr = (vals.otr_count || 0) * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE; // OTR tires = 15 PTE
    return passenger + truck + tractor + otr;
  };

  const calcTonsFromPTE = () => {
    const vals = form.getValues();
    return pteToTons(computeTotalPTE(vals));
  };

  // Auto-calculate weights from PTE when not manually overridden
  useEffect(() => {
    if (!manualWeightOverride) {
      const totalPTE = computeTotalPTE(form.getValues());
      // Michigan conversion: 89 PTE = 1 ton, 1 ton = 2000 lbs
      const tons = totalPTE / 89;
      const pounds = tons * 2000;
      const calculatedGross = Math.round(pounds * 10) / 10; // Round to 1 decimal
      
      form.setValue('gross_weight_lbs', calculatedGross, { shouldValidate: false });
      // Tare weight remains 0 unless manually entered by driver
    }
  }, [
    form.watch('pte_off_rim'),
    form.watch('pte_on_rim'),
    form.watch('commercial_17_5_19_5_off'),
    form.watch('commercial_17_5_19_5_on'),
    form.watch('commercial_22_5_off'),
    form.watch('commercial_22_5_on'),
    form.watch('otr_count'),
    form.watch('tractor_count'),
    manualWeightOverride,
    form
  ]);

  // Fetch pickup, assignment, and hauler data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get pickup only (no implicit joins)
        const { data: pickupRow, error: pickupError } = await supabase
          .from('pickups')
          .select('*')
          .eq('id', pickupId)
          .maybeSingle();

        if (pickupError) throw pickupError;
        if (!pickupRow) {
          setLoadError('Pickup not found');
          return;
        }

        // Fetch client and location explicitly
        const [{ data: client }, { data: location }] = await Promise.all([
          supabase.from('clients').select(
            'id, company_name, contact_name, email, phone, mailing_address, city, state, zip, county, physical_address, physical_city, physical_state, physical_zip'
          ).eq('id', pickupRow.client_id).maybeSingle(),
          supabase.from('locations').select('id, name, address').eq('id', pickupRow.location_id).maybeSingle(),
        ]);

        setPickupData({ ...pickupRow, client, location });
        setLoadError(null);

        // Get assignment for this pickup to find hauler
        const { data: assignment, error: assignmentError } = await supabase
          .from('assignments')
          .select(`
            *,
            hauler:haulers(
              id, hauler_name, hauler_mailing_address,
              hauler_city, hauler_state, hauler_zip, hauler_phone, hauler_mi_reg
            ),
            vehicle:vehicles(id, name, license_plate)
          `)
          .eq('pickup_id', pickupId)
          .maybeSingle();

        if (assignmentError) throw assignmentError;
        
        if (assignment) {
          setAssignmentData(assignment);
          setHaulerData(assignment.hauler);
          
          // Pre-fill hauler printed name with driver's name if available
          if (user?.firstName && user?.lastName) {
            form.setValue('hauler_print_name', `${user.firstName} ${user.lastName}`);
          }
        }

        // Don't pre-fill generator_print_name - let driver enter it manually
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load pickup data",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [pickupId, user, form, toast]);

  // If assignment didn't provide hauler, and there is exactly one active hauler, auto-select it
  useEffect(() => {
    if (!haulerData && haulers.length === 1) {
      setHaulerData(haulers[0]);
    }
  }, [haulers, haulerData]);

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  // Scroll to top when step changes
  useEffect(() => {
    const scrollContainer = document.querySelector('.max-h-\\[50vh\\]');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [step]);

  // Ensure generator printed name starts blank on first visit to Signatures step
  const clearedGeneratorNameRef = useRef(false);
  useEffect(() => {
    if (steps[step]?.key === 'signatures' && !clearedGeneratorNameRef.current) {
      form.setValue('generator_print_name', '', { shouldValidate: false, shouldDirty: false });
      clearedGeneratorNameRef.current = true;
    }
  }, [step, form]);

  const handleNext = async () => {
    // Validate current step before proceeding
    if (currentStep.key === "tires") {
      const values = form.getValues();
      const totalTires = values.pte_off_rim + values.pte_on_rim + 
                        values.commercial_17_5_19_5_off + values.commercial_17_5_19_5_on +
                        values.commercial_22_5_off + values.commercial_22_5_on +
                        values.otr_count + values.tractor_count;
      
      if (totalTires === 0) {
        toast({
          title: "Missing Information",
          description: "Please enter at least one tire count",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep.key === "signatures") {
      const hasGeneratorSig = generatorSigRef.current && !generatorSigRef.current.isEmpty();
      const hasHaulerSig = haulerSigRef.current && !haulerSigRef.current.isEmpty();
      
      if (!hasGeneratorSig || !hasHaulerSig) {
        toast({
          title: "Missing Signatures",
          description: "Both generator and hauler signatures are required",
          variant: "destructive",
        });
        return;
      }

      const valid = await form.trigger(['generator_print_name', 'hauler_print_name']);
      if (!valid) return;

      // Persist signatures now so they survive navigation to Review step
      try {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-');

        if (generatorSigRef.current && !genSigPath) {
          const generatorBlob = await fetch(generatorSigRef.current.toDataURL()).then(r => r.blob());
          const generatorFileName = `signatures/${timestamp}-generator.png`;
          const { error: genUploadError } = await supabase.storage
            .from('manifests')
            .upload(generatorFileName, generatorBlob, { contentType: 'image/png', upsert: true });
          if (genUploadError) throw genUploadError;
          setGenSigPath(generatorFileName);
        }

        if (haulerSigRef.current && !haulSigPath) {
          const haulerBlob = await fetch(haulerSigRef.current.toDataURL()).then(r => r.blob());
          const haulerFileName = `signatures/${timestamp}-hauler.png`;
          const { error: haulUploadError } = await supabase.storage
            .from('manifests')
            .upload(haulerFileName, haulerBlob, { contentType: 'image/png', upsert: true });
          if (haulUploadError) throw haulUploadError;
          setHaulSigPath(haulerFileName);
        }
      } catch (e: any) {
        console.error('Failed to upload signatures before review:', e);
        toast({
          title: "Upload Failed",
          description: "Could not save signatures. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const onSubmit = async (data: ManifestFormData) => {
    console.log('[DRIVER_WIZARD] Form submitted with data:', {
      gross_weight_lbs: data.gross_weight_lbs,
      tare_weight_lbs: data.tare_weight_lbs,
      pte_off_rim: data.pte_off_rim,
      pte_on_rim: data.pte_on_rim,
      totalPTE: computeTotalPTE(data)
    });

    if (!pickupData || !haulerData) {
      toast({
        title: "Error",
        description: "Missing pickup or hauler data",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload signatures to storage
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      
      let generatorSigPath = '';
      let haulerSigPath = '';

      if (generatorSigRef.current && !generatorSigRef.current.isEmpty()) {
        const generatorBlob = await fetch(generatorSigRef.current.toDataURL()).then(r => r.blob());
        const generatorFileName = `signatures/${timestamp}-generator.png`;
        
        const { error: genUploadError } = await supabase.storage
          .from('manifests')
          .upload(generatorFileName, generatorBlob, { contentType: 'image/png', upsert: true });
        
        if (genUploadError) throw genUploadError;
        generatorSigPath = generatorFileName;
      }

      if (haulerSigRef.current && !haulerSigRef.current.isEmpty()) {
        const haulerBlob = await fetch(haulerSigRef.current.toDataURL()).then(r => r.blob());
        const haulerFileName = `signatures/${timestamp}-hauler.png`;
        
        const { error: haulUploadError } = await supabase.storage
          .from('manifests')
          .upload(haulerFileName, haulerBlob, { contentType: 'image/png', upsert: true });
        
        if (haulUploadError) throw haulUploadError;
        haulerSigPath = haulerFileName;
      }

      // 2. Create manifest with all data (including weights)
      const totalPteForPdf = computeTotalPTE(data);
      const gross = Number(data.gross_weight_lbs || 0);
      const tare = Number(data.tare_weight_lbs || 0);
      
      // Calculate final weights for manifest
      let finalGross = gross;
      let finalTare = tare;
      
      // If auto mode and weights are zero, derive from PTE
      if (!manualWeightOverride && (gross <= 0 || tare <= 0)) {
        const computedTons = totalPteForPdf / 89; // Michigan rule: 89 PTE = 1 ton
        finalGross = Math.round((computedTons * 2000) * 10) / 10; // Convert to lbs
        finalTare = Math.round((finalGross * 0.15) * 10) / 10; // 15% of gross
      }
      
      const finalNet = Math.max(0, finalGross - finalTare);
      const tonsFromPte = calcTonsFromPTE();
      const tonsFromNet = finalNet > 0 ? Math.round((finalNet / 2000) * 100) / 100 : 0;
      const resolvedTons = Number(data.weight_tons_manual || 0) > 0 
        ? Number(data.weight_tons_manual)
        : (tonsFromNet > 0 ? tonsFromNet : tonsFromPte);

      const manifestData = {
        client_id: clientId,
        location_id: pickupData.location_id,
        pickup_id: pickupId,
        driver_id: assignmentData?.driver_id,
        vehicle_id: assignmentData?.vehicle_id,
        hauler_id: haulerData.id,
        pte_off_rim: data.pte_off_rim,
        pte_on_rim: data.pte_on_rim,
        commercial_17_5_19_5_off: data.commercial_17_5_19_5_off,
        commercial_17_5_19_5_on: data.commercial_17_5_19_5_on,
        commercial_22_5_off: data.commercial_22_5_off,
        commercial_22_5_on: data.commercial_22_5_on,
        otr_count: data.otr_count,
        tractor_count: data.tractor_count,
        weight_tons: resolvedTons,
        // Store weights directly in manifest for PDF generation
        gross_weight_lbs: finalGross,
        tare_weight_lbs: finalTare,
        net_weight_lbs: finalNet,
        payment_method: 'INVOICE' as const,
        status: 'AWAITING_RECEIVER_SIGNATURE' as const,
      };

      const manifest = await createManifest.mutateAsync(manifestData);

      // 3. Update manifest with hauler, signatures, and timestamps (to-the-second precision)
      const generatorSignedAt = new Date().toISOString();
      const haulerSignedAt = new Date().toISOString();

      await updateManifest.mutateAsync({
        id: manifest.id,
        customer_signature_png_path: generatorSigPath,
        driver_signature_png_path: haulerSigPath,
        status: 'AWAITING_RECEIVER_SIGNATURE',
      });

      // Also update additional fields via direct Supabase update
      const { error: updateError } = await supabase
        .from('manifests')
        .update({
          hauler_id: haulerData.id,
          generator_signed_at: generatorSignedAt,
          hauler_signed_at: haulerSignedAt,
          signed_by_name: data.generator_print_name,
        })
        .eq('id', manifest.id);

      if (updateError) throw updateError;

      // 4. Generate initial PDF with generator and hauler info only
      await manifestIntegration.mutateAsync({
        manifestId: manifest.id,
        overrides: {
          // Generator info from client
          generator_name: pickupData.client.company_name,
          generator_mail_address: pickupData.client.physical_address || pickupData.client.mailing_address,
          generator_city: pickupData.client.physical_city || pickupData.client.city,
          generator_state: pickupData.client.physical_state || pickupData.client.state,
          generator_zip: pickupData.client.physical_zip || pickupData.client.zip,
          generator_county: pickupData.client.county || '',
          generator_phone: pickupData.client.phone || '',
          // Signature paths (both domain and template keys to be safe)
          generator_signature: generatorSigPath,
          
          generator_print_name: `${data.generator_print_name} - ${new Date(generatorSignedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`,
          generator_date: new Date(generatorSignedAt).toLocaleDateString('en-US'),
          generator_time: new Date(generatorSignedAt).toLocaleTimeString('en-US', { hour12: false }),
          generator_volume_weight: String(totalPteForPdf),
          
          // Tire counts for PDF
          passenger_car_count: String((data.pte_off_rim || 0) + (data.pte_on_rim || 0)),
          truck_count: String((data.commercial_17_5_19_5_off || 0) + (data.commercial_17_5_19_5_on || 0) + 
                             (data.commercial_22_5_off || 0) + (data.commercial_22_5_on || 0)),
          oversized_count: String((data.otr_count || 0) + (data.tractor_count || 0)),
          
          // Hauler info from assignment
          hauler_name: haulerData.hauler_name,
          hauler_mail_address: haulerData.hauler_mailing_address || '',
          hauler_city: haulerData.hauler_city || '',
          hauler_state: haulerData.hauler_state || '',
          hauler_zip: haulerData.hauler_zip || '',
          hauler_phone: haulerData.hauler_phone || '',
          hauler_mi_reg: haulerData.hauler_mi_reg || '',
          hauler_signature: haulerSigPath,
          
          hauler_print_name: `${data.hauler_print_name} - ${new Date(haulerSignedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`,
          hauler_date: new Date(haulerSignedAt).toLocaleDateString('en-US'),
          hauler_time: new Date(haulerSignedAt).toLocaleTimeString('en-US', { hour12: false }),
          hauler_total_pte: String(totalPteForPdf),
          
          // Weight fields - send calculated values
          hauler_gross_weight: finalGross > 0 ? finalGross.toFixed(1) : '0.0',
          hauler_tare_weight: finalTare > 0 ? finalTare.toFixed(1) : '0.0',
          hauler_net_weight: finalNet > 0 ? finalNet.toFixed(1) : '0.0',
        }
      });

      // 5. Email the initial manifest to client
      if (pickupData.client.email) {
        await sendEmail.mutateAsync({
          manifestId: manifest.id,
          to: pickupData.client.email,
          subject: `Tire Manifest - ${pickupData.client.company_name}`,
          messageHtml: `<p>Your tire pickup manifest is attached. This is the initial manifest with generator and hauler signatures. A final version will be sent once the receiver has signed.</p>`,
        });
      }

      toast({
        title: "Success",
        description: "Manifest created and emailed successfully. Receiver will complete their section later.",
      });

      // Update pickup status to completed
      await supabase
        .from('pickups')
        .update({ 
          status: 'completed',
          manifest_id: manifest.id 
        })
        .eq('id', pickupId);

      if (onComplete) {
        onComplete();
      } else {
        navigate("/driver/manifests");
      }
    } catch (error: any) {
      console.error("Error creating manifest:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create manifest",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep.key) {
      case "info":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Building className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Review Generator & Hauler Info</h3>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generator (Client)</CardTitle>
                <CardDescription>This information will appear on the manifest</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Company:</strong> {pickupData?.client?.company_name || 'N/A'}</div>
                <div><strong>Address:</strong> {pickupData?.client?.physical_address || pickupData?.client?.mailing_address || 'N/A'}</div>
                <div><strong>City, State ZIP:</strong> {pickupData?.client?.physical_city || pickupData?.client?.city}, {pickupData?.client?.physical_state || pickupData?.client?.state} {pickupData?.client?.physical_zip || pickupData?.client?.zip}</div>
                <div><strong>Phone:</strong> {pickupData?.client?.phone || 'N/A'}</div>
                <div><strong>Contact:</strong> {pickupData?.client?.contact_name || 'N/A'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hauler</CardTitle>
                <CardDescription>Your company information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {haulerData ? (
                  <div className="space-y-2">
                    <div><strong>Company:</strong> {haulerData?.hauler_name || 'N/A'}</div>
                    <div><strong>Address:</strong> {haulerData?.hauler_mailing_address || 'N/A'}</div>
                    <div><strong>City, State ZIP:</strong> {haulerData?.hauler_city}, {haulerData?.hauler_state} {haulerData?.hauler_zip}</div>
                    <div><strong>Phone:</strong> {haulerData?.hauler_phone || 'N/A'}</div>
                    <div><strong>MI Registration:</strong> {haulerData?.hauler_mi_reg || 'N/A'}</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-muted-foreground">No hauler detected from assignment. Select your hauler to continue.</div>
                    <Select onValueChange={(value) => {
                      const selected = haulers.find(h => h.id === value);
                      if (selected) setHaulerData(selected);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a hauler" />
                      </SelectTrigger>
                      <SelectContent>
                        {haulers.map((h) => (
                          <SelectItem key={h.id} value={h.id}>{h.hauler_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {assignmentData?.vehicle && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vehicle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {assignmentData.vehicle.name}</div>
                  <div><strong>License Plate:</strong> {assignmentData.vehicle.license_plate || 'N/A'}</div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "tires":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Enter Tire Counts</h3>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Passenger Tire Equivalents (PTE)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pte_off_rim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Off Rim</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
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
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Commercial 17.5/19.5</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="commercial_17_5_19_5_off"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Off Rim</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
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
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Commercial 22.5</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="commercial_22_5_off"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Off Rim</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
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
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Oversized</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="otr_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OTR Count</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
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
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Weights</CardTitle>
                    <CardDescription>
                      {manualWeightOverride 
                        ? "Manual entry enabled for special cases" 
                        : "Auto-calculated from PTE (89 PTE = 1 ton)"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="manual_override" className="text-sm text-muted-foreground cursor-pointer">
                      Manual Override
                    </Label>
                    <input
                      id="manual_override"
                      type="checkbox"
                      checked={manualWeightOverride}
                      onChange={(e) => setManualWeightOverride(e.target.checked)}
                      className="h-4 w-4 cursor-pointer"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gross_weight_lbs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gross Weight (lbs)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder={manualWeightOverride ? "Enter gross weight" : "Auto-calculated"}
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            readOnly={!manualWeightOverride}
                            className={!manualWeightOverride ? 'bg-muted cursor-not-allowed' : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tare_weight_lbs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tare Weight (lbs)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder={manualWeightOverride ? "Enter tare weight" : "Auto-calc (15% of gross)"}
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            readOnly={!manualWeightOverride}
                            className={!manualWeightOverride ? 'bg-muted cursor-not-allowed' : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <Label>Net Weight (lbs)</Label>
                  <div className="text-lg font-semibold p-2 bg-muted rounded-md">
                    {(() => {
                      const v = form.getValues();
                      const gross = Number(v.gross_weight_lbs || 0);
                      const tare = Number(v.tare_weight_lbs || 0);
                      const net = Math.max(0, gross - tare);
                      return net.toFixed(1);
                    })()}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="weight_tons_manual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manual Weight (tons) - Optional</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Optional override; leave blank to auto-calc" 
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                        />
                      </FormControl>
                      <FormDescription>Leave blank to use calculated weight from PTE</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="text-sm text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-md">
                  <div>Total PTE: <strong>{computeTotalPTE(form.getValues())}</strong></div>
                  <div>Calculated tons (89 PTE = 1 ton): <strong>{calcTonsFromPTE().toFixed(2)}</strong></div>
                  {!manualWeightOverride && (
                    <div className="text-xs mt-2 text-primary">
                      ✓ Weights auto-calculated based on Michigan conversions
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "signatures":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <PenTool className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold">Digital Signatures</h3>
            </div>

            <Card>
              <CardHeader className="px-3 sm:px-6 py-3">
                <CardTitle className="text-sm sm:text-base">Generator Signature</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Client representative signature</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-3 sm:px-6">
                <FormField
                  control={form.control}
                  name="generator_print_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Printed Name *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="Full name"
                          type="text"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          inputMode="text"
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs sm:text-sm">Signature *</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => generatorSigRef.current?.clear()}
                      className="text-xs h-7"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="border-2 border-border rounded-lg bg-white overflow-hidden">
                    <SignatureCanvas
                      ref={generatorSigRef}
                      canvasProps={{ 
                        className: "w-full h-24 sm:h-32 touch-none",
                        style: { width: '100%', height: '96px' }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 sm:px-6 py-3">
                <CardTitle className="text-sm sm:text-base">Hauler Signature</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Driver signature</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-3 sm:px-6">
                <FormField
                  control={form.control}
                  name="hauler_print_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Printed Name *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="Full name"
                          type="text"
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs sm:text-sm">Signature *</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => haulerSigRef.current?.clear()}
                      className="text-xs h-7"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="border-2 border-border rounded-lg bg-white overflow-hidden">
                    <SignatureCanvas
                      ref={haulerSigRef}
                      canvasProps={{ 
                        className: "w-full h-24 sm:h-32 touch-none",
                        style: { width: '100%', height: '96px' }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "review":
        const values = form.getValues();
        const totalPTE = values.pte_off_rim + values.pte_on_rim;
        const totalCommercial = values.commercial_17_5_19_5_off + values.commercial_17_5_19_5_on + 
                               values.commercial_22_5_off + values.commercial_22_5_on;
        const totalOversized = values.otr_count + values.tractor_count;
        const totalPteCalculated = computeTotalPTE(values);
        const gross = Number(values.gross_weight_lbs || 0);
        const tare = Number(values.tare_weight_lbs || 0);
        const net = Math.max(0, gross - tare);
        const tonsCalc = calcTonsFromPTE();

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold">Review & Submit</h3>
            </div>

            <Card>
              <CardHeader className="px-3 sm:px-6 py-3">
                <CardTitle className="text-sm sm:text-base">Tire Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs sm:text-sm px-3 sm:px-6">
                <div className="flex justify-between"><span>PTE (Off/On Rim):</span> <strong>{totalPTE}</strong></div>
                <div className="flex justify-between"><span>Commercial:</span> <strong>{totalCommercial}</strong></div>
                <div className="flex justify-between"><span>Oversized:</span> <strong>{totalOversized}</strong></div>
                <div className="border-t pt-2 flex justify-between"><span><strong>Total PTE:</strong></span> <strong>{totalPteCalculated}</strong></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 sm:px-6 py-3">
                <CardTitle className="text-sm sm:text-base">Weights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs sm:text-sm px-3 sm:px-6">
                <div className="flex justify-between"><span>Gross (lbs):</span> <strong>{gross.toFixed(1)}</strong></div>
                <div className="flex justify-between"><span>Tare (lbs):</span> <strong>{tare.toFixed(1)}</strong></div>
                <div className="flex justify-between"><span>Net (lbs):</span> <strong>{net.toFixed(1)}</strong></div>
                <div className="flex justify-between"><span>Calc tons (89 PTE = 1 ton):</span> <strong>{tonsCalc.toFixed(2)}</strong></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 sm:px-6 py-3">
                <CardTitle className="text-sm sm:text-base">Signatures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs sm:text-sm px-3 sm:px-6">
                <div><strong>Generator:</strong> {values.generator_print_name}</div>
                <div><strong>Hauler:</strong> {values.hauler_print_name}</div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm">
              <p className="font-semibold mb-2">What happens next:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Initial manifest PDF will be generated with generator and hauler signatures</li>
                <li>Manifest will be emailed to the client</li>
                <li>Receiver will complete their section later on the admin portal</li>
                <li>Final manifest with all signatures will be generated and emailed</li>
              </ol>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loadError) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="font-semibold mb-2">Unable to load pickup</div>
            <div className="text-muted-foreground text-sm">{loadError}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pickupData) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center text-muted-foreground">Loading manifest data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="px-3 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg truncate">Create Manifest</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Step {step + 1} of {steps.length}: {currentStep.title}</CardDescription>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="px-3 sm:px-6 py-4">
            <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden pr-1 sm:pr-4">
              {renderStepContent()}
            </div>
          </CardContent>

          <div className="flex items-center justify-between px-3 sm:px-6 py-4 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 0 || isSubmitting}
              className="text-xs sm:text-sm"
            >
              <ChevronLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Back
            </Button>

            {step < steps.length - 1 ? (
              <Button 
                type="button" 
                onClick={handleNext} 
                disabled={isSubmitting}
                className="!bg-green-600 hover:!bg-green-700 !text-white font-semibold disabled:opacity-50 text-xs sm:text-sm"
                style={{ backgroundColor: '#16a34a', color: 'white' }}
              >
                Next
                <ChevronRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="!bg-green-600 hover:!bg-green-700 !text-white font-semibold disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap"
                style={{ backgroundColor: '#16a34a', color: 'white' }}
              >
                {isSubmitting ? "Creating..." : "Create Manifest"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </Card>
  );
}
