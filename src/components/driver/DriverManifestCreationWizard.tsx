import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SearchableDropdown } from "@/components/SearchableDropdown";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateManifest, useUpdateManifest } from "@/hooks/useManifests";
import { useCreateShipmentFromManifest } from "@/hooks/useCreateShipmentFromManifest";
import { useManifestIntegration } from "@/hooks/useManifestIntegration";
import { useSendManifestEmail } from "@/hooks/useSendManifestEmail";
import { useHaulers } from "@/hooks/useHaulers";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CollectPaymentWithCard } from "@/components/driver/CollectPaymentWithCard";
import SignatureCanvas from "react-signature-canvas";
import { pteToTons, MICHIGAN_CONVERSIONS } from "@/lib/michigan-conversions";
import { 
  Building, 
  Truck, 
  Package, 
  ChevronRight,
  ChevronLeft,
  PenTool,
  CheckCircle,
  FileText,
  RefreshCw
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
  pickupId?: string;
  clientId?: string;
  locationName?: string;
  trailerNumber?: string;
  manifestMode?: 'pickup' | 'drop_to_processor';
  onComplete?: () => void;
}

import { DollarSign } from "lucide-react";

const steps = [
  { key: "info", title: "Review Info", icon: Building },
  { key: "tires", title: "Tire Counts", icon: Package },
  { key: "pricing", title: "Pricing Preview", icon: DollarSign },
  { key: "payment-method", title: "Payment Method", icon: DollarSign },
  { key: "signatures", title: "Signatures", icon: PenTool },
  { key: "review", title: "Review & Submit", icon: CheckCircle },
  { key: "payment", title: "Payment", icon: DollarSign },
];

export function DriverManifestCreationWizard({ 
  pickupId, 
  clientId,
  locationName,
  trailerNumber,
  manifestMode = 'pickup',
  onComplete 
}: DriverManifestCreationWizardProps) {
  return <DriverManifestCreationWizardInner pickupId={pickupId} clientId={clientId} locationName={locationName} trailerNumber={trailerNumber} manifestMode={manifestMode} onComplete={onComplete} />;
}

function DriverManifestCreationWizardInner({ 
  pickupId, 
  clientId,
  locationName: initialLocationName,
  trailerNumber: initialTrailerNumber,
  manifestMode = 'pickup',
  onComplete 
}: { pickupId?: string; clientId?: string; locationName?: string; trailerNumber?: string; manifestMode?: 'pickup' | 'drop_to_processor'; onComplete?: () => void }) {
  const isStandalone = !pickupId; // Standalone mode: no pickup, manual entry
  const isDropToProcessor = manifestMode === 'drop_to_processor';
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickupData, setPickupData] = useState<any>(null);
  const [haulerData, setHaulerData] = useState<any>(null);
  const [assignmentData, setAssignmentData] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [standaloneGeneratorName, setStandaloneGeneratorName] = useState<string>(isDropToProcessor ? '' : (initialLocationName || ''));
  const [standaloneClientData, setStandaloneClientData] = useState<any>(null);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [manualWeightOverride, setManualWeightOverride] = useState<boolean>(false);
  const [manifestCreated, setManifestCreated] = useState(false);
  const [createdManifestId, setCreatedManifestId] = useState<string | null>(null);
  const [pteOffRimRate, setPteOffRimRate] = useState<string>("");
  const [pteOnRimRate, setPteOnRimRate] = useState<string>("");
  const [commercial_17_5_19_5_off_rate, setCommercial_17_5_19_5_OffRate] = useState<string>("");
  const [commercial_17_5_19_5_on_rate, setCommercial_17_5_19_5_OnRate] = useState<string>("");
  const [commercial_22_5_off_rate, setCommercial_22_5_OffRate] = useState<string>("");
  const [commercial_22_5_on_rate, setCommercial_22_5_OnRate] = useState<string>("");
  const [otrRate, setOtrRate] = useState<string>("");
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [offlineMethod, setOfflineMethod] = useState<'CASH' | 'CHECK'>('CASH');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [checkNumber, setCheckNumber] = useState<string>("");
  const [driverNotes, setDriverNotes] = useState<string>("");
  // Timestamp locked at moment of signature save (not at submit time)
  const [generatorSignedAt, setGeneratorSignedAt] = useState<string | null>(null);
  const [haulerSignedAt, setHaulerSignedAt] = useState<string | null>(null);
  // Upload status tracking
  const [genSigUploading, setGenSigUploading] = useState(false);
  const [haulSigUploading, setHaulSigUploading] = useState(false);
  // Notes always auto-save to client profile (no toggle needed)
  
  // Use ref for more reliable duplicate prevention
  const isSubmittingRef = useRef(false);

  const PRESET_RATES = {
    passengerOffRim: ['2.50', '2.75', '3.00', '3.25', '3.50'],
    passengerOnRim: ['3.00', '3.25', '3.50', '3.75', '4.00'],
    commercial_17_5_19_5_offRim: ['8.00', '9.00', '10.00', '11.00', '12.00', '13.00', '14.00', '15.00'],
    commercial_17_5_19_5_onRim: ['10.00', '11.00', '12.00', '13.00', '14.00', '15.00', '16.00', '17.00'],
    commercial_22_5_offRim: ['12.00', '13.00', '14.00', '15.00', '16.00', '17.00', '18.00', '19.00', '20.00'],
    commercial_22_5_onRim: ['14.00', '15.00', '16.00', '17.00', '18.00', '19.00', '20.00', '21.00', '22.00'],
    otr: ['50.00', '70.00', '90.00', '110.00', '130.00', '150.00']
  };
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const createManifest = useCreateManifest({ toastOnSuccess: false });
  const updateManifest = useUpdateManifest();
  const manifestIntegration = useManifestIntegration();
  const createShipmentFromManifest = useCreateShipmentFromManifest();
  const sendEmail = useSendManifestEmail();
  const { data: haulers = [] } = useHaulers();

  // Signature refs
  const generatorSigRef = useRef<SignatureCanvas>(null);
  const haulerSigRef = useRef<SignatureCanvas>(null);
  const receiverSigRef = useRef<SignatureCanvas>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [genSigPath, setGenSigPath] = useState<string>('');
  const [haulSigPath, setHaulSigPath] = useState<string>('');
  const [receiverSigPath, setReceiverSigPath] = useState<string>('');
  const [genSigDataUrl, setGenSigDataUrl] = useState<string>('');
  const [haulSigDataUrl, setHaulSigDataUrl] = useState<string>('');
  const [receiverSigDataUrl, setReceiverSigDataUrl] = useState<string>('');
  const [receiverSigUploading, setReceiverSigUploading] = useState(false);
  const [receiverPrintName, setReceiverPrintName] = useState<string>('');
  
  // Client search for standalone mode
  const searchClients = async (search: string) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .ilike('company_name', `%${search}%`)
      .order('company_name')
      .limit(50);
    if (error) return [];
    return data || [];
  };
  const form = useForm<ManifestFormData>({
    resolver: zodResolver(manifestSchema),
    mode: "onChange",
    defaultValues: {
      pte_off_rim: undefined,
      pte_on_rim: undefined,
      commercial_17_5_19_5_off: undefined,
      commercial_17_5_19_5_on: undefined,
      commercial_22_5_off: undefined,
      commercial_22_5_on: undefined,
      otr_count: undefined,
      tractor_count: undefined,
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
      const grossPounds = tons * 2000;
      const calculatedGross = Math.round(grossPounds * 10) / 10; // Round to 1 decimal
      
      // For scrap tires, gross weight IS the net weight (tires only, no vehicle)
      // Tare weight defaults to 0.0 for scrap tire pickups
      form.setValue('gross_weight_lbs', calculatedGross, { shouldValidate: false });
      form.setValue('tare_weight_lbs', 0, { shouldValidate: false });
      
      console.log('[WEIGHT_CALC] Auto-calculated weights:', {
        totalPTE,
        tons: tons.toFixed(3),
        grossLbs: calculatedGross,
        tareLbs: 0,
        netLbs: calculatedGross,
        formula: `${totalPTE} PTE ÷ 89 = ${tons.toFixed(3)} tons × 2000 = ${calculatedGross} lbs`
      });
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

  // Calculate payment total when rates change (for pricing preview and payment steps)
  useEffect(() => {
    if (steps[step]?.key === "pricing" || steps[step]?.key === "payment") {
      const formValues = form.getValues();
      const pteOffRimCount = formValues.pte_off_rim || 0;
      const pteOnRimCount = formValues.pte_on_rim || 0;
      const commercial_17_5_19_5_off_count = formValues.commercial_17_5_19_5_off || 0;
      const commercial_17_5_19_5_on_count = formValues.commercial_17_5_19_5_on || 0;
      const commercial_22_5_off_count = formValues.commercial_22_5_off || 0;
      const commercial_22_5_on_count = formValues.commercial_22_5_on || 0;
      const otrTotalCount = (formValues.otr_count || 0) + (formValues.tractor_count || 0);

      const pteOffRimAmount = pteOffRimCount * (parseFloat(pteOffRimRate) || 0);
      const pteOnRimAmount = pteOnRimCount * (parseFloat(pteOnRimRate) || 0);
      const commercial_17_5_19_5_off_amount = commercial_17_5_19_5_off_count * (parseFloat(commercial_17_5_19_5_off_rate) || 0);
      const commercial_17_5_19_5_on_amount = commercial_17_5_19_5_on_count * (parseFloat(commercial_17_5_19_5_on_rate) || 0);
      const commercial_22_5_off_amount = commercial_22_5_off_count * (parseFloat(commercial_22_5_off_rate) || 0);
      const commercial_22_5_on_amount = commercial_22_5_on_count * (parseFloat(commercial_22_5_on_rate) || 0);
      const otrAmount = otrTotalCount * (parseFloat(otrRate) || 0);
      
      setCalculatedTotal(pteOffRimAmount + pteOnRimAmount + commercial_17_5_19_5_off_amount + commercial_17_5_19_5_on_amount + commercial_22_5_off_amount + commercial_22_5_on_amount + otrAmount);
    }
  }, [pteOffRimRate, pteOnRimRate, commercial_17_5_19_5_off_rate, commercial_17_5_19_5_on_rate, commercial_22_5_off_rate, commercial_22_5_on_rate, otrRate, step, form]);

  // Fetch pickup, assignment, and hauler data on mount (only in pickup mode)
  useEffect(() => {
    if (isStandalone) {
      // In standalone mode, pre-fill hauler name and mark as ready
      if (user?.firstName && user?.lastName) {
        form.setValue('hauler_print_name', `${user.firstName} ${user.lastName}`);
      }
      // Set a minimal pickupData so the loading screen doesn't block
      setPickupData({ standalone: true });
      return;
    }

    const fetchData = async () => {
      try {
        // Get pickup only (no implicit joins)
        const { data: pickupRow, error: pickupError } = await supabase
          .from('pickups')
          .select('*')
          .eq('id', pickupId!)
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
        // Resolve client_id from pickup or prop
        const finalClientId = pickupRow.client_id || clientId;
        if (!finalClientId) {
          setLoadError('Client ID is missing. Cannot create manifest without a valid client.');
          return;
        }
        setResolvedClientId(finalClientId);
        setLoadError(null);

        // Get assignment for this pickup to find hauler
        const { data: assignment, error: assignmentError } = await supabase
          .from('assignments')
          .select(`
            *,
            hauler:haulers(
              id, company_name, mailing_address,
              city, state, zip, phone, hauler_mi_reg
            ),
            vehicle:vehicles(id, name, license_plate)
          `)
          .eq('pickup_id', pickupId!)
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
  }, [pickupId, user, form, toast, isStandalone]);

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
    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step]);

  // Ensure generator printed name starts blank on first visit to Signatures step
  const clearedGeneratorNameRef = useRef(false);
  useEffect(() => {
    if (steps[step]?.key === 'signatures' && !clearedGeneratorNameRef.current) {
      form.setValue('generator_print_name', '', { shouldValidate: false, shouldDirty: false });
      clearedGeneratorNameRef.current = true;
    }
  }, [step, form]);

  // Restore signatures to canvas whenever component renders and canvas is empty
  useEffect(() => {
    if (steps[step]?.key === 'signatures') {
      // Restore generator signature if we have it saved
      if (genSigDataUrl && generatorSigRef.current && generatorSigRef.current.isEmpty()) {
        generatorSigRef.current.fromDataURL(genSigDataUrl);
      }
      // Restore hauler signature if we have it saved
      if (haulSigDataUrl && haulerSigRef.current && haulerSigRef.current.isEmpty()) {
        haulerSigRef.current.fromDataURL(haulSigDataUrl);
      }
      // Restore receiver signature if we have it saved
      if (receiverSigDataUrl && receiverSigRef.current && receiverSigRef.current.isEmpty()) {
        receiverSigRef.current.fromDataURL(receiverSigDataUrl);
      }
    }
  });

  // Auto-save signatures as they're drawn (prevents loss on re-render)
  const handleGeneratorSignatureEnd = () => {
    if (generatorSigRef.current && !generatorSigRef.current.isEmpty()) {
      const dataUrl = generatorSigRef.current.toDataURL();
      setGenSigDataUrl(dataUrl);
    }
  };

  const handleHaulerSignatureEnd = () => {
    if (haulerSigRef.current && !haulerSigRef.current.isEmpty()) {
      const dataUrl = haulerSigRef.current.toDataURL();
      setHaulSigDataUrl(dataUrl);
    }
  };

  const handleReceiverSignatureEnd = () => {
    if (receiverSigRef.current && !receiverSigRef.current.isEmpty()) {
      const dataUrl = receiverSigRef.current.toDataURL();
      setReceiverSigDataUrl(dataUrl);
    }
  };

  // Blur any active input to prevent the Android keyboard from staying open when signing
  const blurActiveInputs = () => {
    const ae = document.activeElement as HTMLElement | null;
    if (ae && typeof ae.blur === 'function') {
      ae.blur();
    }
  };

  const handleNext = async () => {
    console.log('[MANIFEST_WIZARD] handleNext called at step:', currentStep.key, 'haulerData:', haulerData);
    
    // CRITICAL: Validate hauler at EVERY step to prevent bypassing
    if (!haulerData) {
      console.error('[MANIFEST_WIZARD] Hauler validation failed - no hauler data available');
      console.log('[MANIFEST_WIZARD] Available haulers:', haulers);
      toast({
        title: "Missing Hauler Information",
        description: "No hauler is assigned. Please go back to the first step and select a hauler company.",
        variant: "destructive",
      });
      return;
    }

    // Validate hauler selection on info step
    if (currentStep.key === "info") {
      if (!haulerData) {
        console.error('[MANIFEST_WIZARD] Info step validation failed - no hauler selected');
        toast({
          title: "Hauler Required",
          description: "Please select a hauler company before continuing",
          variant: "destructive",
        });
        return;
      }
      
      // Ensure hauler has required fields
      if (!haulerData.company_name || !haulerData.hauler_mi_reg) {
        console.error('[MANIFEST_WIZARD] Hauler validation failed - missing required fields:', {
          company_name: haulerData.company_name,
          hauler_mi_reg: haulerData.hauler_mi_reg
        });
        toast({
          title: "Incomplete Hauler Information",
          description: "The selected hauler is missing required information (company name or MI registration). Please contact your administrator.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('[MANIFEST_WIZARD] Info step validation passed - hauler is valid:', haulerData.company_name);
      
      // In standalone mode, require generator name
      if (isStandalone && !standaloneGeneratorName.trim()) {
        toast({
          title: "Generator Name Required",
          description: "Please enter a generator/location name before continuing",
          variant: "destructive",
        });
        return;
      }

      // For drop_to_processor, require receiver selection
      if (isDropToProcessor && !standaloneClientData) {
        toast({
          title: "Receiver Required",
          description: "Please select a receiver/processor before continuing",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate current step before proceeding
    if (currentStep.key === "tires") {
      const values = form.getValues();
      const totalTires = (values.pte_off_rim || 0) + (values.pte_on_rim || 0) + 
                        (values.commercial_17_5_19_5_off || 0) + (values.commercial_17_5_19_5_on || 0) +
                        (values.commercial_22_5_off || 0) + (values.commercial_22_5_on || 0) +
                        (values.otr_count || 0) + (values.tractor_count || 0);
      
      if (totalTires === 0) {
        toast({
          title: "Missing Information",
          description: "Please enter at least one tire count",
          variant: "destructive",
        });
        return;
      }
    }

    // MANDATORY PRICING VALIDATION - Driver CANNOT skip this step
    if (currentStep.key === "pricing") {
      const values = form.getValues();
      const pteOffRimCount = values.pte_off_rim || 0;
      const pteOnRimCount = values.pte_on_rim || 0;
      const commercial_17_5_19_5_off_count = values.commercial_17_5_19_5_off || 0;
      const commercial_17_5_19_5_on_count = values.commercial_17_5_19_5_on || 0;
      const commercial_22_5_off_count = values.commercial_22_5_off || 0;
      const commercial_22_5_on_count = values.commercial_22_5_on || 0;
      const otrTotalCount = (values.otr_count || 0) + (values.tractor_count || 0);

      // Validate EACH tire type has a rate entered if tires exist
      if (pteOffRimCount > 0 && (!pteOffRimRate || parseFloat(pteOffRimRate) <= 0)) {
        toast({
          title: "Pricing Required - Cannot Continue",
          description: "Please enter a rate for Passenger Off-Rim tires. Revenue entry is mandatory.",
          variant: "destructive",
        });
        return;
      }

      if (pteOnRimCount > 0 && (!pteOnRimRate || parseFloat(pteOnRimRate) <= 0)) {
        toast({
          title: "Pricing Required - Cannot Continue",
          description: "Please enter a rate for Passenger On-Rim tires. Revenue entry is mandatory.",
          variant: "destructive",
        });
        return;
      }

      if (commercial_17_5_19_5_off_count > 0 && (!commercial_17_5_19_5_off_rate || parseFloat(commercial_17_5_19_5_off_rate) <= 0)) {
        toast({
          title: "Pricing Required - Cannot Continue",
          description: "Please enter a rate for Commercial 17.5-19.5 Off-Rim tires. Revenue entry is mandatory.",
          variant: "destructive",
        });
        return;
      }

      if (commercial_17_5_19_5_on_count > 0 && (!commercial_17_5_19_5_on_rate || parseFloat(commercial_17_5_19_5_on_rate) <= 0)) {
        toast({
          title: "Pricing Required - Cannot Continue",
          description: "Please enter a rate for Commercial 17.5-19.5 On-Rim tires. Revenue entry is mandatory.",
          variant: "destructive",
        });
        return;
      }

      if (commercial_22_5_off_count > 0 && (!commercial_22_5_off_rate || parseFloat(commercial_22_5_off_rate) <= 0)) {
        toast({
          title: "Pricing Required - Cannot Continue",
          description: "Please enter a rate for Commercial 22.5 Off-Rim tires. Revenue entry is mandatory.",
          variant: "destructive",
        });
        return;
      }

      if (commercial_22_5_on_count > 0 && (!commercial_22_5_on_rate || parseFloat(commercial_22_5_on_rate) <= 0)) {
        toast({
          title: "Pricing Required - Cannot Continue",
          description: "Please enter a rate for Commercial 22.5 On-Rim tires. Revenue entry is mandatory.",
          variant: "destructive",
        });
        return;
      }

      if (otrTotalCount > 0 && (!otrRate || parseFloat(otrRate) <= 0)) {
        toast({
          title: "Pricing Required - Cannot Continue",
          description: "Please enter a rate for OTR/Tractor tires. Revenue entry is mandatory.",
          variant: "destructive",
        });
        return;
      }
      
      // FINAL CHECK: Total revenue MUST be greater than $0
      if (calculatedTotal <= 0) {
        toast({
          title: "Revenue Required - Cannot Continue",
          description: "Total amount must be greater than $0.00. Please verify all pricing rates are entered correctly.",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep.key === "signatures") {
      const hasGeneratorSig = generatorSigRef.current && !generatorSigRef.current.isEmpty();
      const hasHaulerSig = haulerSigRef.current && !haulerSigRef.current.isEmpty();
      const hasReceiverSig = isDropToProcessor ? (receiverSigRef.current && !receiverSigRef.current.isEmpty()) : true;
      
      if (!hasGeneratorSig || !hasHaulerSig) {
        toast({
          title: "Missing Signatures",
          description: "Both generator and hauler signatures are required",
          variant: "destructive",
        });
        return;
      }

      if (isDropToProcessor && !hasReceiverSig) {
        toast({
          title: "Missing Receiver Signature",
          description: "Receiver signature is required for processor drops",
          variant: "destructive",
        });
        return;
      }

      if (isDropToProcessor && !receiverPrintName.trim()) {
        toast({
          title: "Missing Receiver Name",
          description: "Receiver printed name is required",
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

        // Helper to convert data URL to Blob (in-browser, no network fetch)
        const dataURLtoBlob = (dataURL: string): Blob => {
          const arr = dataURL.split(',');
          const mimeMatch = arr[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          return new Blob([u8arr], { type: mime });
        };

        // --- Generator signature ---
        if (generatorSigRef.current && !genSigPath) {
          setGenSigUploading(true);
          console.log('[DRIVER_WIZARD] Saving generator signature...');
          // Lock timestamp NOW — at the moment the user tapped Save, not at form submit
          const genTimestamp = new Date().toISOString();
          const dataUrl = generatorSigRef.current.toDataURL();
          setGenSigDataUrl(dataUrl);
          const generatorBlob = dataURLtoBlob(dataUrl);
          const generatorFileName = `signatures/${timestamp}-generator.png`;
          const { error: genUploadError, data: genUploadData } = await supabase.storage
            .from('manifests')
            .upload(generatorFileName, generatorBlob, { contentType: 'image/png', upsert: true });
          setGenSigUploading(false);
          if (genUploadError) {
            const isPermission = genUploadError.message?.toLowerCase().includes('policy') ||
              genUploadError.message?.toLowerCase().includes('permission') ||
              (genUploadError as any).statusCode === 403;
            console.error('[DRIVER_WIZARD] Generator signature upload error:', genUploadError);
            throw new Error(
              isPermission
                ? 'Storage permission denied for generator signature. Please ask your admin to check storage policies, then try again.'
                : `Generator signature upload failed: ${genUploadError.message}. Please check your internet connection and try again.`
            );
          }
          // Verify the file actually landed (non-null path confirms success)
          if (!genUploadData?.path) {
            throw new Error('Generator signature upload returned no path — the file may not have saved. Please try again.');
          }
          setGenSigPath(generatorFileName);
          setGeneratorSignedAt(genTimestamp); // Lock the timestamp at the moment of signing
          console.log('[DRIVER_WIZARD] Generator signature saved:', generatorFileName, 'at', genTimestamp);
        }

        // --- Hauler signature ---
        if (haulerSigRef.current && !haulSigPath) {
          setHaulSigUploading(true);
          console.log('[DRIVER_WIZARD] Saving hauler signature...');
          const haulTimestamp = new Date().toISOString();
          const dataUrl = haulerSigRef.current.toDataURL();
          setHaulSigDataUrl(dataUrl);
          const haulerBlob = dataURLtoBlob(dataUrl);
          const haulerFileName = `signatures/${timestamp}-hauler.png`;
          const { error: haulUploadError, data: haulUploadData } = await supabase.storage
            .from('manifests')
            .upload(haulerFileName, haulerBlob, { contentType: 'image/png', upsert: true });
          setHaulSigUploading(false);
          if (haulUploadError) {
            const isPermission = haulUploadError.message?.toLowerCase().includes('policy') ||
              haulUploadError.message?.toLowerCase().includes('permission') ||
              (haulUploadError as any).statusCode === 403;
            console.error('[DRIVER_WIZARD] Hauler signature upload error:', haulUploadError);
            throw new Error(
              isPermission
                ? 'Storage permission denied for hauler signature. Please ask your admin to check storage policies, then try again.'
                : `Hauler signature upload failed: ${haulUploadError.message}. Please check your internet connection and try again.`
            );
          }
          if (!haulUploadData?.path) {
            throw new Error('Hauler signature upload returned no path — the file may not have saved. Please try again.');
          }
          setHaulSigPath(haulerFileName);
          setHaulerSignedAt(haulTimestamp);
          console.log('[DRIVER_WIZARD] Hauler signature saved:', haulerFileName, 'at', haulTimestamp);
        }

        // --- Receiver signature (drop_to_processor only) ---
        if (isDropToProcessor && receiverSigRef.current && !receiverSigPath) {
          setReceiverSigUploading(true);
          console.log('[DRIVER_WIZARD] Saving receiver signature...');
          const recvTimestamp = new Date().toISOString();
          const dataUrl = receiverSigRef.current.toDataURL();
          setReceiverSigDataUrl(dataUrl);
          const receiverBlob = dataURLtoBlob(dataUrl);
          const receiverFileName = `signatures/${timestamp}-receiver.png`;
          const { error: recvUploadError, data: recvUploadData } = await supabase.storage
            .from('manifests')
            .upload(receiverFileName, receiverBlob, { contentType: 'image/png', upsert: true });
          setReceiverSigUploading(false);
          if (recvUploadError) {
            throw new Error(`Receiver signature upload failed: ${recvUploadError.message}`);
          }
          if (!recvUploadData?.path) {
            throw new Error('Receiver signature upload returned no path.');
          }
          setReceiverSigPath(receiverFileName);
          console.log('[DRIVER_WIZARD] Receiver signature saved:', receiverFileName);
        }

        console.log('[DRIVER_WIZARD] All signatures saved successfully');
      } catch (e: any) {
        setGenSigUploading(false);
        setHaulSigUploading(false);
        setReceiverSigUploading(false);
        console.error('[DRIVER_WIZARD] Failed to upload signatures:', e);
        toast({
          title: "Upload Failed",
          description: e.message || "Could not save signatures. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Final validation before submission on review step
    if (currentStep.key === "review") {
      // Ensure we have pickup and hauler data
      if (!pickupData) {
        toast({
          title: "Error",
          description: "Pickup data is missing. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      if (!haulerData) {
        toast({
          title: "Error",
          description: "Hauler information is missing. Please go back to the first step and select a hauler.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate hauler has all required fields
      if (!haulerData.company_name || !haulerData.hauler_mi_reg) {
        toast({
          title: "Incomplete Hauler Information",
          description: "The selected hauler is missing required information. Please contact your administrator to complete the hauler profile.",
          variant: "destructive",
        });
        return;
      }
      
      // Ensure we have a valid client (only in pickup mode)
      if (!isStandalone && (!pickupData.client || !pickupData.client.company_name)) {
        toast({
          title: "Error",
          description: "Client information is missing. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      // Ensure signatures are still saved
      if (!genSigPath || !haulSigPath) {
        toast({
          title: "Error",
          description: "Signatures were not saved properly. Please go back to the Signatures step.",
          variant: "destructive",
        });
        return;
      }

      // Validate tire counts one more time
      const values = form.getValues();
      const totalTires = (values.pte_off_rim || 0) + (values.pte_on_rim || 0) + 
                        (values.commercial_17_5_19_5_off || 0) + (values.commercial_17_5_19_5_on || 0) +
                        (values.commercial_22_5_off || 0) + (values.commercial_22_5_on || 0) +
                        (values.otr_count || 0) + (values.tractor_count || 0);
      
      if (totalTires === 0) {
        toast({
          title: "Error",
          description: "No tire counts found. Please go back to the Tire Counts step.",
          variant: "destructive",
        });
        return;
      }

      // Validate printed names
      if (!values.generator_print_name || values.generator_print_name.trim() === '') {
        toast({
          title: "Error",
          description: "Generator printed name is required. Please go back to the Signatures step.",
          variant: "destructive",
        });
        return;
      }

      if (!values.hauler_print_name || values.hauler_print_name.trim() === '') {
        toast({
          title: "Error",
          description: "Hauler printed name is required. Please go back to the Signatures step.",
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
    // CRITICAL: Prevent duplicate manifest creation
    if (isSubmittingRef.current || isSubmitting) {
      console.log('[DRIVER_WIZARD] Submission already in progress, ignoring duplicate click');
      return;
    }
    
    console.log('[DRIVER_WIZARD] Form submitted with data:', {
      gross_weight_lbs: data.gross_weight_lbs,
      tare_weight_lbs: data.tare_weight_lbs,
      pte_off_rim: data.pte_off_rim,
      pte_on_rim: data.pte_on_rim,
      totalPTE: computeTotalPTE(data),
      pickupData: !!pickupData,
      haulerData: !!haulerData,
      assignmentData: !!assignmentData
    });

    if (!pickupData) {
      toast({
        title: "Error",
        description: "Pickup data is not loaded. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!haulerData) {
      toast({
        title: "Missing Hauler Information",
        description: "No hauler is assigned to this pickup. Please contact your administrator to assign a hauler to this pickup first.",
        variant: "destructive",
      });
      return;
    }

    // Check if a manifest already exists for this pickup (prevents duplicates) - only in pickup mode
    let manifest: any = null;
    let isExistingManifest = false;

    if (pickupId) {
      const { data: existingManifests, error: checkError } = await supabase
        .from('manifests')
        .select('id, manifest_number, status')
        .eq('pickup_id', pickupId)
        .limit(1);

      if (checkError) {
        console.error('[DRIVER_WIZARD] Error checking for existing manifests:', checkError);
      } else if (existingManifests && existingManifests.length > 0) {
        manifest = existingManifests[0];
        isExistingManifest = true;
        console.log('[DRIVER_WIZARD] Using existing manifest:', manifest);
        toast({
          title: "Using Existing Manifest",
          description: `Found existing manifest (${manifest.manifest_number}). Completing the pickup...`,
        });
      }
    }

    // Set both state and ref to prevent race conditions
    setIsSubmitting(true);
    isSubmittingRef.current = true;

    try {
      // 1. Use previously persisted signature paths from state (uploaded during Signatures step)
      let generatorSigPath = genSigPath;
      let haulerSigPath = haulSigPath;

      if (!generatorSigPath || !haulerSigPath) {
        // As a fallback, try to grab from the manifest record if state is empty
        const { data: manifestSigRow } = await supabase
          .from('manifests')
          .select('customer_signature_png_path, driver_signature_png_path')
          .eq('id', pickupData.manifest_id || '')
          .maybeSingle();

        if (manifestSigRow) {
          if (!generatorSigPath && manifestSigRow.customer_signature_png_path) {
            generatorSigPath = manifestSigRow.customer_signature_png_path as string;
          }
          if (!haulerSigPath && manifestSigRow.driver_signature_png_path) {
            haulerSigPath = manifestSigRow.driver_signature_png_path as string;
          }
        }
      }

      if (!generatorSigPath || !haulerSigPath) {
        toast({
          title: 'Missing Signatures',
          description: 'Please go back to the Signatures step and capture both signatures.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }


      // 2. Create manifest with all data (including weights)
      const totalPteForPdf = computeTotalPTE(data);
      const gross = Number(data.gross_weight_lbs || 0);
      const tare = Number(data.tare_weight_lbs || 0);
      
      // Calculate final weights for manifest
      let finalGross = gross;
      let finalTare = tare;
      
      // If auto mode, compute weights from PTE using Michigan rules
      if (!manualWeightOverride) {
        const computedTons = totalPteForPdf / 89; // Michigan rule: 89 PTE = 1 ton
        finalGross = Math.round((computedTons * 2000) * 10) / 10; // Convert to lbs, round to 1 decimal
        finalTare = 0; // Scrap tire pickups: tare is always 0 (tires only, no vehicle weight)
      }
      
        // Net weight = Gross - Tare (round to 0.1 lb)
      const finalNet = Math.max(0, Math.round((finalGross - finalTare) * 10) / 10);
      
      // Validation: Ensure net weight makes sense
      if (finalNet > finalGross) {
        toast({
          title: 'Weight Calculation Error',
          description: `Net weight (${finalNet} lbs) cannot exceed gross weight (${finalGross} lbs). Please check your entries.`,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }
      
      console.log('[MANIFEST_SUBMIT] Final weight calculations:', {
        totalPTE: totalPteForPdf,
        finalGross,
        finalTare,
        finalNet,
        autoMode: !manualWeightOverride,
        formula: `${totalPteForPdf} PTE ÷ 89 × 2000 = ${finalGross} lbs`
      });
      const tonsFromPte = calcTonsFromPTE();
      const tonsFromNet = finalNet > 0 ? Math.round((finalNet / 2000) * 100) / 100 : 0;
      const resolvedTons = Number(data.weight_tons_manual || 0) > 0 
        ? Number(data.weight_tons_manual)
        : (tonsFromNet > 0 ? tonsFromNet : tonsFromPte);

      // Validate client_id before creating manifest (not required in standalone mode)
      if (!isStandalone && !resolvedClientId) {
        toast({
          title: 'Missing Client Information',
          description: 'Cannot create manifest without a valid client ID.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const manifestData = {
        client_id: resolvedClientId || undefined,
        location_id: isStandalone ? undefined : pickupData.location_id,
        pickup_id: pickupId || undefined,
        driver_id: isStandalone ? user?.id : assignmentData?.driver_id,
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
        total: calculatedTotal, // Revenue collected at pickup
        payment_method: paymentMethod as 'CARD' | 'CASH' | 'CHECK' | 'INVOICE',
        payment_status: (paymentMethod === 'CASH' || paymentMethod === 'CHECK') ? ('SUCCEEDED' as const) : ('PENDING' as const),
        status: isDropToProcessor ? 'COMPLETED' as const : 'AWAITING_RECEIVER_SIGNATURE' as const,
        direction: isDropToProcessor ? 'outbound' : 'inbound',
      };

      // Only create a new manifest if one doesn't exist
      if (!isExistingManifest) {
        manifest = await createManifest.mutateAsync(manifestData);
      }

      // 3. Update manifest with hauler, signatures, and timestamps (to-the-second precision)
      const generatorSignedAt = new Date().toISOString();
      const haulerSignedAt = new Date().toISOString();

      await updateManifest.mutateAsync({
        id: manifest.id,
        customer_signature_png_path: generatorSigPath,
        driver_signature_png_path: haulerSigPath,
        ...(isDropToProcessor && receiverSigPath ? { receiver_signature_png_path: receiverSigPath } : {}),
        status: isDropToProcessor ? 'COMPLETED' : 'AWAITING_RECEIVER_SIGNATURE',
      });

      // Also update additional fields via direct Supabase update
      // CRITICAL: Include total field to ensure revenue is always saved
      const { error: updateError } = await supabase
        .from('manifests')
        .update({
          hauler_id: haulerData.id,
          generator_signed_at: generatorSignedAt,
          hauler_signed_at: haulerSignedAt,
          signed_by_name: data.generator_print_name,
          signed_by_title: data.hauler_print_name, // Store hauler's print name in title field
          total: calculatedTotal, // MUST include total to ensure revenue is persisted
          payment_method: paymentMethod,
          payment_status: (paymentMethod === 'CASH' || paymentMethod === 'CHECK') ? 'SUCCEEDED' : 'PENDING',
          ...(paymentMethod === 'CHECK' && checkNumber.trim() ? { check_number: checkNumber.trim() } : {}),
        })
        .eq('id', manifest.id);

      if (updateError) throw updateError;

      // 4. Generate initial PDF with generator and hauler info only
      console.log('[DRIVER_WIZARD] Using signature paths for PDF:', {
        generatorSigPath,
        haulerSigPath,
      });
      await manifestIntegration.mutateAsync({
        manifestId: manifest.id,
        overrides: {
          // Generator info - from client data, standalone client search, or manual entry
          generator_name: isStandalone 
            ? standaloneGeneratorName 
            : pickupData.client?.company_name,
          generator_mail_address: isStandalone 
            ? (isDropToProcessor ? '' : (standaloneClientData?.physical_address || standaloneClientData?.mailing_address || ''))
            : (pickupData.client?.physical_address || pickupData.client?.mailing_address),
          generator_city: isStandalone 
            ? (isDropToProcessor ? '' : (standaloneClientData?.physical_city || standaloneClientData?.city || ''))
            : (pickupData.client?.physical_city || pickupData.client?.city),
          generator_state: isStandalone 
            ? (isDropToProcessor ? '' : (standaloneClientData?.physical_state || standaloneClientData?.state || ''))
            : (pickupData.client?.physical_state || pickupData.client?.state),
          generator_zip: isStandalone 
            ? (isDropToProcessor ? '' : (standaloneClientData?.physical_zip || standaloneClientData?.zip || ''))
            : (pickupData.client?.physical_zip || pickupData.client?.zip),
          generator_county: isStandalone ? '' : (pickupData.client?.county || ''),
          generator_phone: isStandalone 
            ? (isDropToProcessor ? '' : (standaloneClientData?.phone || ''))
            : (pickupData.client?.phone || ''),
          // Signature paths
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
          hauler_name: haulerData.company_name,
          hauler_mail_address: haulerData.mailing_address || '',
          hauler_city: haulerData.city || '',
          hauler_state: haulerData.state || '',
          hauler_zip: haulerData.zip || '',
          hauler_phone: haulerData.phone || '',
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

          // Receiver info for drop_to_processor (3-signature flow)
          ...(isDropToProcessor && receiverSigPath ? {
            receiver_name: standaloneClientData?.company_name || '',
            receiver_mail_address: standaloneClientData?.physical_address || standaloneClientData?.mailing_address || '',
            receiver_city: standaloneClientData?.physical_city || standaloneClientData?.city || '',
            receiver_state: standaloneClientData?.physical_state || standaloneClientData?.state || '',
            receiver_zip: standaloneClientData?.physical_zip || standaloneClientData?.zip || '',
            receiver_phone: standaloneClientData?.phone || '',
            receiver_signature: receiverSigPath,
            receiver_print_name: `${receiverPrintName} - ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`,
            receiver_date: new Date().toLocaleDateString('en-US'),
          } : {}),
        }
      });

      // 4a. Save the initial PDF path (generator + hauler signatures only)
      const { data: pdfPathData } = await supabase
        .from('manifests')
        .select('acroform_pdf_path')
        .eq('id', manifest.id)
        .single();
      
      if (pdfPathData?.acroform_pdf_path) {
        await supabase
          .from('manifests')
          .update({ 
            initial_pdf_path: pdfPathData.acroform_pdf_path 
          })
          .eq('id', manifest.id);
        console.log('[DRIVER_WIZARD] Saved initial PDF path:', pdfPathData.acroform_pdf_path);
      }

      // 5. Email the manifest to client/receiver
      const emailTarget = isStandalone 
        ? standaloneClientData?.email 
        : pickupData.client?.email;
      const emailCompanyName = isStandalone 
        ? (standaloneClientData?.company_name || standaloneGeneratorName) 
        : pickupData.client?.company_name;
      
      if (emailTarget) {
        console.log('📧 Attempting to send manifest email to:', emailTarget);
        try {
          const emailMessage = isDropToProcessor
            ? `<p>Your tire delivery manifest is attached. All signatures have been collected on-site.</p>`
            : `<p>Your tire pickup manifest is attached. This is the initial manifest with generator and hauler signatures. A final version will be sent once the receiver has signed.</p>`;
          await sendEmail.mutateAsync({
            manifestId: manifest.id,
            to: emailTarget,
            subject: `Tire Manifest - ${emailCompanyName}`,
            messageHtml: emailMessage,
          });
          console.log('✅ Email sent successfully to:', emailTarget);
        } catch (emailError: any) {
          console.error('❌ Email sending failed:', emailError);
          toast({
            title: "Email Warning",
            description: `Manifest created but email failed: ${emailError.message || 'Unknown error'}`,
            variant: "destructive",
          });
        }
      } else {
        console.warn('⚠️ No email address for client:', emailCompanyName);
        toast({
          title: "No Email Address",
          description: `Manifest created but ${emailCompanyName || 'client'} has no email address configured.`,
          variant: "destructive",
        });
      }

      toast({
        title: "Success",
        description: requiresInvoice 
          ? "Manifest created - marked for invoicing"
          : "Manifest created successfully with generator and hauler signatures",
      });

      // 5b. Auto-create shipment record for processor drops (outbound tracking)
      if (isDropToProcessor && manifest.id) {
        try {
          // Look up BSG (origin) and processor (destination) entity IDs
          const { data: ownEntity } = await (supabase
            .from('entities')
            .select('id')
            .eq('organization_id', user?.currentOrganization?.id || '')
            .eq('entity_type', 'origin')
            .limit(1)
            .single() as any);

          const processorName = standaloneClientData?.company_name || '';
          const { data: destEntity } = await (supabase
            .from('entities')
            .select('id')
            .ilike('legal_name', `%${processorName}%`)
            .limit(1)
            .single() as any);

          if (ownEntity && destEntity) {
            const totalPte = (data.pte_off_rim || 0) + (data.pte_on_rim || 0) +
              5 * ((data.commercial_17_5_19_5_off || 0) + (data.commercial_17_5_19_5_on || 0) +
                   (data.commercial_22_5_off || 0) + (data.commercial_22_5_on || 0) +
                   (data.tractor_count || 0)) +
              15 * (data.otr_count || 0);

            await createShipmentFromManifest.mutateAsync({
              manifestId: manifest.id,
              originEntityId: ownEntity.id,
              destinationEntityId: destEntity.id,
              materialForm: 'whole_tires' as any,
              quantityPte: totalPte,
              departedAt: new Date().toISOString(),
              arrivedAt: new Date().toISOString(),
            });
            console.log('✅ Shipment record created for processor drop:', manifest.id);
          } else {
            console.warn('⚠️ Could not find entities for shipment creation. Origin:', !!ownEntity, 'Dest:', !!destEntity);
          }
        } catch (shipmentError) {
          console.error('Failed to create shipment record for processor drop:', shipmentError);
          // Don't fail the manifest — shipment is supplementary
        }
      }

      // Update pickup status to completed AND save revenue and payment info (only in pickup mode)
      if (pickupId) {
        const { error: pickupUpdateError } = await supabase
          .from('pickups')
          .update({ 
            status: 'completed',
            manifest_id: manifest.id,
            computed_revenue: calculatedTotal,
            final_revenue: calculatedTotal,
            payment_method: paymentMethod,
            payment_status: paymentMethod === 'CASH' || paymentMethod === 'CHECK' ? 'SUCCEEDED' : 'PENDING',
            ...(paymentMethod === 'CHECK' && checkNumber.trim() ? { check_number: checkNumber.trim() } : {}),
          })
          .eq('id', pickupId);

        if (pickupUpdateError) {
          console.error('Error updating pickup status:', pickupUpdateError);
        }
      }

      // Update assignment status to completed
      if (assignmentData?.id) {
        const { error: assignmentUpdateError } = await supabase
          .from('assignments')
          .update({
            status: 'completed',
            actual_arrival: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', assignmentData.id);

        if (assignmentUpdateError) {
          console.error('Error updating assignment status:', assignmentUpdateError);
        }
      }

      // Save driver notes to client profile if checkbox is checked
      if (driverNotes.trim() && resolvedClientId) {
        const timestamp = new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
        const driverName = user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : 'Driver';
        
        // Get current client notes
        const { data: currentClient } = await supabase
          .from('clients')
          .select('notes')
          .eq('id', resolvedClientId)
          .single();
        
        const existingNotes = currentClient?.notes || '';
        const newNote = `[${timestamp} - ${driverName}]: ${driverNotes.trim()}`;
        const updatedNotes = existingNotes 
          ? `${existingNotes}\n\n${newNote}` 
          : newNote;
        
        const { error: clientUpdateError } = await supabase
          .from('clients')
          .update({ notes: updatedNotes })
          .eq('id', resolvedClientId);
        
        if (clientUpdateError) {
          console.error('Error saving notes to client:', clientUpdateError);
        } else {
          console.log('✅ Driver notes saved to client profile');
        }
      }

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      queryClient.invalidateQueries({ queryKey: ['client', resolvedClientId] });
      console.log('✅ Queries invalidated - UI should refresh');

      // Ensure manifest PDF is generated and linked (only in pickup mode)
      if (pickupId) {
        console.log('🔧 Ensuring manifest PDF is generated for pickup:', pickupId);
        try {
          const { data: pdfData, error: pdfError } = await supabase.functions.invoke(
            'ensure-manifest-pdf',
            {
              body: { pickup_id: pickupId }
            }
          );
          
          if (pdfError) {
            console.error('❌ ensure-manifest-pdf error:', pdfError);
          } else {
            console.log('✅ Manifest PDF ensured:', pdfData);
          }
        } catch (pdfErr) {
          console.error('❌ Failed to ensure manifest PDF:', pdfErr);
          // Don't block the flow if this fails
        }
      }

      // Store manifest ID and mark as created
      setCreatedManifestId(manifest.id);
      setManifestCreated(true);
      
      // Handle Stripe card payment
      if (paymentMethod === 'CARD') {
        console.log('[STRIPE] Creating itemized checkout for card payment');
        try {
          // Build itemized line items from tire counts and pricing
          const lineItems: Array<{ description: string; quantity: number; unit_amount: number }> = [];
          
          if ((data.pte_off_rim || 0) > 0 && parseFloat(pteOffRimRate) > 0) {
            lineItems.push({
              description: 'Passenger Tires (Off-Rim)',
              quantity: data.pte_off_rim || 0,
              unit_amount: Math.round(parseFloat(pteOffRimRate) * 100), // Convert to cents
            });
          }
          
          if ((data.pte_on_rim || 0) > 0 && parseFloat(pteOnRimRate) > 0) {
            lineItems.push({
              description: 'Passenger Tires (On-Rim)',
              quantity: data.pte_on_rim || 0,
              unit_amount: Math.round(parseFloat(pteOnRimRate) * 100),
            });
          }
          
          if ((data.commercial_17_5_19_5_off || 0) > 0 && parseFloat(commercial_17_5_19_5_off_rate) > 0) {
            lineItems.push({
              description: 'Commercial 17.5"/19.5" Tires (Off-Rim)',
              quantity: data.commercial_17_5_19_5_off || 0,
              unit_amount: Math.round(parseFloat(commercial_17_5_19_5_off_rate) * 100),
            });
          }
          
          if ((data.commercial_17_5_19_5_on || 0) > 0 && parseFloat(commercial_17_5_19_5_on_rate) > 0) {
            lineItems.push({
              description: 'Commercial 17.5"/19.5" Tires (On-Rim)',
              quantity: data.commercial_17_5_19_5_on || 0,
              unit_amount: Math.round(parseFloat(commercial_17_5_19_5_on_rate) * 100),
            });
          }
          
          if ((data.commercial_22_5_off || 0) > 0 && parseFloat(commercial_22_5_off_rate) > 0) {
            lineItems.push({
              description: 'Commercial 22.5" Tires (Off-Rim)',
              quantity: data.commercial_22_5_off || 0,
              unit_amount: Math.round(parseFloat(commercial_22_5_off_rate) * 100),
            });
          }
          
          if ((data.commercial_22_5_on || 0) > 0 && parseFloat(commercial_22_5_on_rate) > 0) {
            lineItems.push({
              description: 'Commercial 22.5" Tires (On-Rim)',
              quantity: data.commercial_22_5_on || 0,
              unit_amount: Math.round(parseFloat(commercial_22_5_on_rate) * 100),
            });
          }
          
          const otrTotal = (data.otr_count || 0) + (data.tractor_count || 0);
          if (otrTotal > 0 && parseFloat(otrRate) > 0) {
            lineItems.push({
              description: 'OTR/Tractor Tires',
              quantity: otrTotal,
              unit_amount: Math.round(parseFloat(otrRate) * 100),
            });
          }
          
          const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
            'create-tire-checkout',
            {
              body: {
                line_items: lineItems,
                customer_email: isStandalone ? undefined : pickupData.client?.email,
                customer_name: isStandalone ? standaloneGeneratorName : pickupData.client?.company_name,
                pickup_id: pickupId || undefined,
                manifest_id: manifest.id,
                client_id: resolvedClientId || undefined,
              }
            }
          );
          
          if (checkoutError) throw checkoutError;
          
          if (checkoutData?.url) {
            // Open Stripe checkout in new tab
            window.open(checkoutData.url, '_blank');
            
            toast({
              title: "Stripe Checkout Opened",
              description: "Customer payment window opened in new tab with itemized receipt",
            });
            
            // Complete the wizard - driver can continue while customer pays
            if (onComplete) {
              onComplete();
            } else {
              navigate("/driver/routes");
            }
          }
        } catch (stripeError: any) {
          console.error('[STRIPE] Checkout error:', stripeError);
          toast({
            title: "Payment Setup Error",
            description: `Couldn't open Stripe checkout: ${stripeError.message}. Manifest created successfully.`,
            variant: "destructive",
          });
          
          // Still complete the workflow even if Stripe fails
          if (onComplete) {
            onComplete();
          } else {
            navigate("/driver/routes");
          }
        }
      } else if (requiresInvoice || paymentMethod === 'INVOICE' || paymentMethod === 'CARD_ON_FILE') {
        // Complete the wizard for invoice/card-on-file customers
        if (onComplete) {
          onComplete();
        } else {
          navigate("/driver/manifests");
        }
      } else {
        // Move to payment step for cash/check customers (legacy flow)
        setStep(step + 1);
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
      isSubmittingRef.current = false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep.key) {
      case "info":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Building className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">{isStandalone ? 'Enter Generator & Hauler Info' : 'Review Generator & Hauler Info'}</h3>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isDropToProcessor ? 'Generator (Your Company)' : isStandalone ? 'Generator (Location/Company)' : 'Generator (Client)'}
                </CardTitle>
                <CardDescription>
                  {isDropToProcessor ? 'BSG is the generator for processor drops' : 'This information will appear on the manifest'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {isDropToProcessor ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="standalone-generator">Generator Name *</Label>
                      <Input
                        id="standalone-generator"
                        value={standaloneGeneratorName}
                        onChange={(e) => setStandaloneGeneratorName(e.target.value)}
                        placeholder="e.g., BSG Tire Recycling"
                        className="mt-1"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      For processor drops, your company is the generator since it's your material being delivered.
                    </div>
                  </div>
                ) : isStandalone ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Search Client / Generator *</Label>
                      <SearchableDropdown
                        placeholder="Search for client..."
                        searchFunction={searchClients}
                        onSelect={(client) => {
                          if (client) {
                            setStandaloneClientData(client);
                            setStandaloneGeneratorName(client.company_name);
                            setResolvedClientId(client.id);
                          } else {
                            setStandaloneClientData(null);
                            setStandaloneGeneratorName('');
                            setResolvedClientId(null);
                          }
                        }}
                        displayField="company_name"
                        selected={standaloneClientData}
                      />
                    </div>
                    {standaloneClientData && (
                      <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                        <div><strong>Address:</strong> {standaloneClientData.physical_address || standaloneClientData.mailing_address || 'N/A'}</div>
                        <div><strong>Phone:</strong> {standaloneClientData.phone || 'N/A'}</div>
                        <div><strong>Email:</strong> {standaloneClientData.email || 'N/A'}</div>
                      </div>
                    )}
                    {!standaloneClientData && (
                      <div>
                        <Label htmlFor="standalone-generator-manual" className="text-xs text-muted-foreground">Or type name manually</Label>
                        <Input
                          id="standalone-generator-manual"
                          value={standaloneGeneratorName}
                          onChange={(e) => setStandaloneGeneratorName(e.target.value)}
                          placeholder="Enter generator/location name"
                          className="mt-1"
                        />
                      </div>
                    )}
                    {initialTrailerNumber && (
                      <div className="text-xs text-muted-foreground">
                        Trailer: #{initialTrailerNumber}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div><strong>Company:</strong> {pickupData?.client?.company_name || 'N/A'}</div>
                    <div><strong>Address:</strong> {pickupData?.client?.physical_address || pickupData?.client?.mailing_address || 'N/A'}</div>
                    <div><strong>City, State ZIP:</strong> {pickupData?.client?.physical_city || pickupData?.client?.city}, {pickupData?.client?.physical_state || pickupData?.client?.state} {pickupData?.client?.physical_zip || pickupData?.client?.zip}</div>
                    <div><strong>Phone:</strong> {pickupData?.client?.phone || 'N/A'}</div>
                    <div><strong>Contact:</strong> {pickupData?.client?.contact_name || 'N/A'}</div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Receiver selection for drop_to_processor */}
            {isDropToProcessor && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Receiver (Processor)</CardTitle>
                  <CardDescription>The facility receiving the tires</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <Label>Search Processor / Receiver *</Label>
                    <SearchableDropdown
                      placeholder="Search for receiver..."
                      searchFunction={searchClients}
                      onSelect={(client) => {
                        if (client) {
                          setStandaloneClientData(client);
                          setResolvedClientId(client.id);
                        } else {
                          setStandaloneClientData(null);
                          setResolvedClientId(null);
                        }
                      }}
                      displayField="company_name"
                      selected={standaloneClientData}
                    />
                  </div>
                  {standaloneClientData && (
                    <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                      <div><strong>Address:</strong> {standaloneClientData.physical_address || standaloneClientData.mailing_address || 'N/A'}</div>
                      <div><strong>Phone:</strong> {standaloneClientData.phone || 'N/A'}</div>
                      <div><strong>Email:</strong> {standaloneClientData.email || 'N/A'}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hauler {!haulerData && <span className="text-destructive">*Required</span>}</CardTitle>
                <CardDescription>Your company information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {haulerData ? (
                  <div className="space-y-2">
                    <div><strong>Company:</strong> {haulerData?.company_name || 'N/A'}</div>
                    <div><strong>Address:</strong> {haulerData?.mailing_address || 'N/A'}</div>
                    <div><strong>City, State ZIP:</strong> {haulerData?.city}, {haulerData?.state} {haulerData?.zip}</div>
                    <div><strong>Phone:</strong> {haulerData?.phone || 'N/A'}</div>
                    <div><strong>MI Registration:</strong> {haulerData?.hauler_mi_reg || 'N/A'}</div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setHaulerData(null)}
                      className="mt-2"
                    >
                      Change Hauler
                    </Button>
                  </div>
                 ) : (
                  <div className="space-y-3">
                    <div className="text-sm bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-md p-4">
                      <strong className="text-red-700 dark:text-red-400 block mb-2">🚨 REQUIRED: Hauler Selection</strong>
                      <p className="text-red-600 dark:text-red-300">You cannot proceed without selecting a hauler company. If no hauler appears in the list below, contact your administrator immediately.</p>
                    </div>
                    <div>
                      <Label htmlFor="hauler-select" className="text-sm font-medium mb-2 block text-red-700 dark:text-red-400">
                        Select Hauler Company * (REQUIRED)
                      </Label>
                      {haulers.length === 0 ? (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-md">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>No haulers available.</strong> Please contact your administrator to set up a hauler account before creating manifests.
                          </p>
                        </div>
                      ) : (
                        <Select 
                          value={haulerData?.id || ""}
                          onValueChange={(value) => {
                            console.log('[MANIFEST_WIZARD] Hauler selection changed:', value);
                            const selected = haulers.find(h => h.id === value);
                            console.log('[MANIFEST_WIZARD] Selected hauler object:', selected);
                            
                            if (selected) {
                              // Validate the hauler has required fields
                              if (!selected.company_name || !selected.hauler_mi_reg) {
                                console.error('[MANIFEST_WIZARD] Selected hauler is incomplete:', {
                                  id: selected.id,
                                  company_name: selected.company_name,
                                  hauler_mi_reg: selected.hauler_mi_reg
                                });
                                toast({
                                  title: "Incomplete Hauler",
                                  description: "This hauler is missing required information. Please contact your administrator.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              console.log('[MANIFEST_WIZARD] Setting hauler data:', selected.company_name);
                              setHaulerData(selected);
                              
                              toast({
                                title: "Hauler Selected",
                                description: `${selected.company_name} has been selected.`,
                              });
                            } else {
                              console.error('[MANIFEST_WIZARD] No hauler found with ID:', value);
                            }
                          }}
                        >
                          <SelectTrigger id="hauler-select" className="w-full border-red-300 dark:border-red-700">
                            <SelectValue placeholder="Choose a hauler..." />
                          </SelectTrigger>
                          <SelectContent>
                            {haulers.map((h) => (
                              <SelectItem key={h.id} value={h.id}>
                                {h.company_name} {h.hauler_mi_reg ? `(${h.hauler_mi_reg})` : '(⚠️ Missing MI Reg)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
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
                            step="0.1"
                            placeholder={manualWeightOverride ? "Enter tare weight" : "0.0 (Tires only)"}
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            readOnly={!manualWeightOverride}
                            className={!manualWeightOverride ? 'bg-muted cursor-not-allowed' : ''}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          For scrap tire pickups, tare is typically 0 (weighing tires only, not vehicle)
                        </FormDescription>
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
                      
                      // Validation warning if net > gross (shouldn't happen)
                      if (tare > gross && gross > 0) {
                        return <span className="text-destructive">⚠️ Error: Tare exceeds Gross</span>;
                      }
                      
                      return net.toFixed(1);
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Net = Gross - Tare {!manualWeightOverride && "(For tires only, Net = Gross)"}
                  </p>
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
                      ✓ Weights auto-calculated based on state conversions
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "pricing":
        const formValues = form.getValues();
        const pteOffRimCount = formValues.pte_off_rim || 0;
        const pteOnRimCount = formValues.pte_on_rim || 0;
        const commercial_17_5_19_5_off_count = formValues.commercial_17_5_19_5_off || 0;
        const commercial_17_5_19_5_on_count = formValues.commercial_17_5_19_5_on || 0;
        const commercial_22_5_off_count = formValues.commercial_22_5_off || 0;
        const commercial_22_5_on_count = formValues.commercial_22_5_on || 0;
        const otrTotalCount = (formValues.otr_count || 0) + (formValues.tractor_count || 0);

        const pteOffRimAmount = pteOffRimCount * (parseFloat(pteOffRimRate) || 0);
        const pteOnRimAmount = pteOnRimCount * (parseFloat(pteOnRimRate) || 0);
        const commercial_17_5_19_5_off_amount = commercial_17_5_19_5_off_count * (parseFloat(commercial_17_5_19_5_off_rate) || 0);
        const commercial_17_5_19_5_on_amount = commercial_17_5_19_5_on_count * (parseFloat(commercial_17_5_19_5_on_rate) || 0);
        const commercial_22_5_off_amount = commercial_22_5_off_count * (parseFloat(commercial_22_5_off_rate) || 0);
        const commercial_22_5_on_amount = commercial_22_5_on_count * (parseFloat(commercial_22_5_on_rate) || 0);
        const otrAmount = otrTotalCount * (parseFloat(otrRate) || 0);
        const previewTotal = pteOffRimAmount + pteOnRimAmount + commercial_17_5_19_5_off_amount + commercial_17_5_19_5_on_amount + commercial_22_5_off_amount + commercial_22_5_on_amount + otrAmount;

        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Set Rates & Preview Payment</h3>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Enter the rates for each tire type to calculate the total amount the customer will pay. This is a preview - actual payment collection happens after signatures.
              </p>
            </div>

            <div className="space-y-4">
              {pteOffRimCount > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Passenger Off-Rim ({pteOffRimCount} tires)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quick Select Rate</Label>
                      <Select 
                        value={PRESET_RATES.passengerOffRim.includes(pteOffRimRate) ? pteOffRimRate : ''} 
                        onValueChange={setPteOffRimRate}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select preset rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.passengerOffRim.map((rate) => (
                            <SelectItem key={rate} value={rate}>
                              ${rate} per tire
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Or Enter Custom Rate</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        placeholder="0.00"
                        value={pteOffRimRate}
                        onChange={(e) => setPteOffRimRate(e.target.value)}
                        className="text-base font-medium"
                      />
                    </div>
                    {pteOffRimAmount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold">${pteOffRimAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {pteOnRimCount > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Passenger On-Rim ({pteOnRimCount} tires)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quick Select Rate</Label>
                      <Select 
                        value={PRESET_RATES.passengerOnRim.includes(pteOnRimRate) ? pteOnRimRate : ''} 
                        onValueChange={setPteOnRimRate}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select preset rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.passengerOnRim.map((rate) => (
                            <SelectItem key={rate} value={rate}>
                              ${rate} per tire
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Or Enter Custom Rate</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        placeholder="0.00"
                        value={pteOnRimRate}
                        onChange={(e) => setPteOnRimRate(e.target.value)}
                        className="text-base font-medium"
                      />
                    </div>
                    {pteOnRimAmount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold">${pteOnRimAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {commercial_17_5_19_5_off_count > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">17.5"/19.5" Off-Rim ({commercial_17_5_19_5_off_count} tires)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quick Select Rate</Label>
                      <Select 
                        value={PRESET_RATES.commercial_17_5_19_5_offRim.includes(commercial_17_5_19_5_off_rate) ? commercial_17_5_19_5_off_rate : ''} 
                        onValueChange={setCommercial_17_5_19_5_OffRate}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select preset rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.commercial_17_5_19_5_offRim.map((rate) => (
                            <SelectItem key={rate} value={rate}>
                              ${rate} per tire
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Or Enter Custom Rate</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        placeholder="0.00"
                        value={commercial_17_5_19_5_off_rate}
                        onChange={(e) => setCommercial_17_5_19_5_OffRate(e.target.value)}
                        className="text-base font-medium"
                      />
                    </div>
                    {commercial_17_5_19_5_off_amount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold">${commercial_17_5_19_5_off_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {commercial_17_5_19_5_on_count > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">17.5"/19.5" On-Rim ({commercial_17_5_19_5_on_count} tires)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quick Select Rate</Label>
                      <Select 
                        value={PRESET_RATES.commercial_17_5_19_5_onRim.includes(commercial_17_5_19_5_on_rate) ? commercial_17_5_19_5_on_rate : ''} 
                        onValueChange={setCommercial_17_5_19_5_OnRate}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select preset rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.commercial_17_5_19_5_onRim.map((rate) => (
                            <SelectItem key={rate} value={rate}>
                              ${rate} per tire
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Or Enter Custom Rate</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        placeholder="0.00"
                        value={commercial_17_5_19_5_on_rate}
                        onChange={(e) => setCommercial_17_5_19_5_OnRate(e.target.value)}
                        className="text-base font-medium"
                      />
                    </div>
                    {commercial_17_5_19_5_on_amount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold">${commercial_17_5_19_5_on_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {commercial_22_5_off_count > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">22.5" Off-Rim ({commercial_22_5_off_count} tires)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quick Select Rate</Label>
                      <Select 
                        value={PRESET_RATES.commercial_22_5_offRim.includes(commercial_22_5_off_rate) ? commercial_22_5_off_rate : ''} 
                        onValueChange={setCommercial_22_5_OffRate}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select preset rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.commercial_22_5_offRim.map((rate) => (
                            <SelectItem key={rate} value={rate}>
                              ${rate} per tire
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Or Enter Custom Rate</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        placeholder="0.00"
                        value={commercial_22_5_off_rate}
                        onChange={(e) => setCommercial_22_5_OffRate(e.target.value)}
                        className="text-base font-medium"
                      />
                    </div>
                    {commercial_22_5_off_amount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold">${commercial_22_5_off_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {commercial_22_5_on_count > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">22.5" On-Rim ({commercial_22_5_on_count} tires)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quick Select Rate</Label>
                      <Select 
                        value={PRESET_RATES.commercial_22_5_onRim.includes(commercial_22_5_on_rate) ? commercial_22_5_on_rate : ''} 
                        onValueChange={setCommercial_22_5_OnRate}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select preset rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.commercial_22_5_onRim.map((rate) => (
                            <SelectItem key={rate} value={rate}>
                              ${rate} per tire
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Or Enter Custom Rate</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        placeholder="0.00"
                        value={commercial_22_5_on_rate}
                        onChange={(e) => setCommercial_22_5_OnRate(e.target.value)}
                        className="text-base font-medium"
                      />
                    </div>
                    {commercial_22_5_on_amount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold">${commercial_22_5_on_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {otrTotalCount > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">OTR/Tractor Tires ({otrTotalCount} tires)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quick Select Rate</Label>
                      <Select 
                        value={PRESET_RATES.otr.includes(otrRate) ? otrRate : ''} 
                        onValueChange={setOtrRate}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select preset rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.otr.map((rate) => (
                            <SelectItem key={rate} value={rate}>
                              ${rate} per tire
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Or Enter Custom Rate</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        placeholder="0.00"
                        value={otrRate}
                        onChange={(e) => setOtrRate(e.target.value)}
                        className="text-base font-medium"
                      />
                    </div>
                    {otrAmount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold">${otrAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {previewTotal > 0 && (
                <Card className="border-2 border-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Total to Collect:</span>
                      <span className="text-3xl font-bold text-primary">${previewTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      This amount will be charged after signatures are collected
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Invoice Customer Option */}
              <Card className="border-amber-500/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div className="space-y-1">
                        <Label htmlFor="invoice-toggle" className="text-base font-semibold cursor-pointer">
                          Invoice Customer
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Mark this customer to be invoiced instead of collecting payment now
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="invoice-toggle"
                      checked={requiresInvoice}
                      onCheckedChange={setRequiresInvoice}
                    />
                  </div>
                  {requiresInvoice && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Payment step will be skipped. Billing will invoice this customer.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "payment-method":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Select Payment Method</h3>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Select how the customer is paying for this pickup. For card on file, office staff will process the payment later.
              </p>
            </div>

            <div className="space-y-3">
              <Card 
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${paymentMethod === 'CASH' ? 'border-primary border-2' : ''}`}
                onClick={() => setPaymentMethod('CASH')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${paymentMethod === 'CASH' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                      {paymentMethod === 'CASH' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Cash</h4>
                      <p className="text-sm text-muted-foreground">Customer paid with cash on site</p>
                      <div className="mt-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 rounded text-xs inline-block">
                        Payment Complete
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${paymentMethod === 'CARD_ON_FILE' ? 'border-primary border-2' : ''}`}
                onClick={() => setPaymentMethod('CARD_ON_FILE')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${paymentMethod === 'CARD_ON_FILE' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                      {paymentMethod === 'CARD_ON_FILE' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Card on File</h4>
                      <p className="text-sm text-muted-foreground">Office will charge the customer's saved card</p>
                      <div className="mt-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 rounded text-xs inline-block">
                        Pending - Office Processing Required
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${paymentMethod === 'INVOICE' ? 'border-primary border-2' : ''}`}
                onClick={() => setPaymentMethod('INVOICE')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${paymentMethod === 'INVOICE' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                      {paymentMethod === 'INVOICE' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Invoice Later</h4>
                      <p className="text-sm text-muted-foreground">Customer will be invoiced for this pickup</p>
                      <div className="mt-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 rounded text-xs inline-block">
                        Pending - Invoice to be Sent
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${paymentMethod === 'CHECK' ? 'border-primary border-2' : ''}`}
                onClick={() => setPaymentMethod('CHECK')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${paymentMethod === 'CHECK' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                      {paymentMethod === 'CHECK' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Check</h4>
                      <p className="text-sm text-muted-foreground">Customer paid with a check</p>
                      <div className="mt-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 rounded text-xs inline-block">
                        Payment Complete
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Check Number Input - shown when CHECK is selected */}
              {paymentMethod === 'CHECK' && (
                <Card className={`border-primary/30 bg-primary/5 ${!checkNumber.trim() ? 'border-destructive border-2' : ''}`}>
                  <CardContent className="p-4">
                    <Label htmlFor="check-number" className="text-sm font-medium mb-2 block">
                      Check Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="check-number"
                      type="text"
                      placeholder="Enter check number (e.g. 4521)"
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                      className={`max-w-xs ${!checkNumber.trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {!checkNumber.trim() ? (
                      <p className="text-xs text-destructive mt-1 font-medium">
                        ⚠ Check number is required to complete this stop.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        This will be visible to office staff on the route planning page.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card 
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${paymentMethod === 'CARD' ? 'border-primary border-2' : ''}`}
                onClick={() => setPaymentMethod('CARD')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${paymentMethod === 'CARD' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                      {paymentMethod === 'CARD' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Card (Stripe)</h4>
                      <p className="text-sm text-muted-foreground">Customer will pay now with credit/debit card</p>
                      <div className="mt-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded text-xs inline-block">
                        Immediate Card Payment via Stripe
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Payment Status</p>
                    <p className="text-muted-foreground">
                      {paymentMethod === 'CASH' && 'Payment will be marked as COMPLETED immediately.'}
                      {paymentMethod === 'CARD_ON_FILE' && 'Payment will be marked as PENDING until office staff processes the card charge.'}
                      {paymentMethod === 'INVOICE' && 'Payment will be marked as PENDING until the invoice is paid.'}
                      {paymentMethod === 'CHECK' && 'Payment will be marked as COMPLETED immediately.'}
                      {paymentMethod === 'CARD' && 'Customer will be redirected to secure Stripe checkout to pay immediately with itemized receipt.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-900 dark:text-amber-100 font-medium mb-1">
                Total Amount: ${calculatedTotal.toFixed(2)}
              </p>
              <p className="text-xs text-amber-900/70 dark:text-amber-100/70">
                This is the amount that {paymentMethod === 'CASH' || paymentMethod === 'CHECK' ? 'was collected' : paymentMethod === 'CARD' ? 'customer will pay via Stripe' : 'will be charged'}.
              </p>
            </div>
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
                      onClick={() => {
                        generatorSigRef.current?.clear();
                        setGenSigDataUrl('');
                      }}
                      className="text-xs h-7"
                    >
                      Clear
                    </Button>
                  </div>
                  <div 
                    className="border-2 border-border rounded-lg bg-white overflow-hidden"
                    onTouchStart={(e) => { blurActiveInputs(); e.stopPropagation(); }}
                    onPointerDown={() => blurActiveInputs()}
                  >
                    <SignatureCanvas
                      ref={generatorSigRef}
                      onEnd={handleGeneratorSignatureEnd}
                      canvasProps={{ 
                        className: "w-full h-24 sm:h-32 touch-none",
                        style: { 
                          width: '100%', 
                          height: '96px', 
                          touchAction: 'none',
                          WebkitUserSelect: 'none',
                          userSelect: 'none'
                        }
                      }}
                    />
                  </div>
                  {genSigUploading && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Uploading signature…
                    </div>
                  )}
                  {!genSigUploading && genSigPath && (
                    <div className="text-xs text-primary flex items-center gap-1 mt-1 font-medium">
                      <CheckCircle className="h-3 w-3" />
                      Generator signature saved ✓
                    </div>
                  )}
                  {!genSigUploading && !genSigPath && genSigDataUrl && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      Signature drawn — will be uploaded when you tap Next
                    </div>
                  )}
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
                      onClick={() => {
                        haulerSigRef.current?.clear();
                        setHaulSigDataUrl('');
                      }}
                      className="text-xs h-7"
                    >
                      Clear
                    </Button>
                  </div>
                  <div 
                    className="border-2 border-border rounded-lg bg-white overflow-hidden"
                    onTouchStart={(e) => { blurActiveInputs(); e.stopPropagation(); }}
                    onPointerDown={() => blurActiveInputs()}
                  >
                    <SignatureCanvas
                      ref={haulerSigRef}
                      onEnd={handleHaulerSignatureEnd}
                      canvasProps={{ 
                        className: "w-full h-24 sm:h-32 touch-none",
                        style: { 
                          width: '100%', 
                          height: '96px', 
                          touchAction: 'none',
                          WebkitUserSelect: 'none',
                          userSelect: 'none'
                        }
                      }}
                    />
                  </div>
                  {haulSigUploading && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Uploading signature…
                    </div>
                  )}
                  {!haulSigUploading && haulSigPath && (
                    <div className="text-xs text-primary flex items-center gap-1 mt-1 font-medium">
                      <CheckCircle className="h-3 w-3" />
                      Hauler signature saved ✓
                    </div>
                  )}
                  {!haulSigUploading && !haulSigPath && haulSigDataUrl && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      Signature drawn — will be uploaded when you tap Next
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Receiver Signature - only for drop_to_processor */}
            {isDropToProcessor && (
              <Card>
                <CardHeader className="px-3 sm:px-6 py-3">
                  <CardTitle className="text-sm sm:text-base">Receiver Signature</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Processor representative signature (collected on-site)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-3 sm:px-6">
                  <div>
                    <Label className="text-xs sm:text-sm">Printed Name *</Label>
                    <Input 
                      value={receiverPrintName}
                      onChange={(e) => setReceiverPrintName(e.target.value)}
                      placeholder="Receiver's full name"
                      type="text"
                      autoComplete="off"
                      className="text-sm mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-xs sm:text-sm">Signature *</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          receiverSigRef.current?.clear();
                          setReceiverSigDataUrl('');
                        }}
                        className="text-xs h-7"
                      >
                        Clear
                      </Button>
                    </div>
                    <div 
                      className="border-2 border-border rounded-lg bg-white overflow-hidden"
                      onTouchStart={(e) => { blurActiveInputs(); e.stopPropagation(); }}
                      onPointerDown={() => blurActiveInputs()}
                    >
                      <SignatureCanvas
                        ref={receiverSigRef}
                        onEnd={handleReceiverSignatureEnd}
                        canvasProps={{ 
                          className: "w-full h-24 sm:h-32 touch-none",
                          style: { 
                            width: '100%', 
                            height: '96px', 
                            touchAction: 'none',
                            WebkitUserSelect: 'none',
                            userSelect: 'none'
                          }
                        }}
                      />
                    </div>
                    {receiverSigUploading && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 animate-pulse">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Uploading signature…
                      </div>
                    )}
                    {!receiverSigUploading && receiverSigPath && (
                      <div className="text-xs text-primary flex items-center gap-1 mt-1 font-medium">
                        <CheckCircle className="h-3 w-3" />
                        Receiver signature saved ✓
                      </div>
                    )}
                    {!receiverSigUploading && !receiverSigPath && receiverSigDataUrl && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        Signature drawn — will be uploaded when you tap Next
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "review":
        const values = form.getValues();
        const totalPTE = (values.pte_off_rim || 0) + (values.pte_on_rim || 0);
        const totalCommercial = (values.commercial_17_5_19_5_off || 0) + (values.commercial_17_5_19_5_on || 0) + 
                               (values.commercial_22_5_off || 0) + (values.commercial_22_5_on || 0);
        const totalOversized = (values.otr_count || 0) + (values.tractor_count || 0);
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

            {/* Driver Notes Section */}
            <Card>
              <CardHeader className="px-3 sm:px-6 py-3">
                <CardTitle className="text-sm sm:text-base">Driver Notes</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Add any notes about this pickup (access issues, special instructions, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-3 sm:px-6">
                <textarea
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="Enter any notes about this pickup..."
                  className="w-full min-h-[80px] p-3 text-sm border rounded-md resize-none bg-background"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Notes will automatically save to the client profile.</p>
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

      case "payment":
        const paymentFormValues = form.getValues();
        const paymentPteOffRimCount = paymentFormValues.pte_off_rim || 0;
        const paymentPteOnRimCount = paymentFormValues.pte_on_rim || 0;
        const payment_17_5_19_5_off_count = paymentFormValues.commercial_17_5_19_5_off || 0;
        const payment_17_5_19_5_on_count = paymentFormValues.commercial_17_5_19_5_on || 0;
        const payment_22_5_off_count = paymentFormValues.commercial_22_5_off || 0;
        const payment_22_5_on_count = paymentFormValues.commercial_22_5_on || 0;
        const paymentOtrTotalCount = (paymentFormValues.otr_count || 0) + (paymentFormValues.tractor_count || 0);

        const handleCollectPayment = async () => {
          if (paymentMethod === 'CHECK' && !checkNumber.trim()) {
            toast({
              title: "Check Number Required",
              description: "Please enter the check number before completing payment",
              variant: "destructive",
            });
            return;
          }
          if (calculatedTotal <= 0) {
            toast({
              title: "Invalid Total",
              description: "Total amount must be greater than $0",
              variant: "destructive",
            });
            return;
          }

          try {
            // Update the pickup with computed_revenue (only in pickup mode)
            if (pickupId) {
              const { error } = await supabase
                .from('pickups')
                .update({ computed_revenue: calculatedTotal })
                .eq('id', pickupId);

              if (error) throw error;
            }

            // Show payment dialog
            setShowPaymentDialog(true);
          } catch (error: any) {
            console.error('Failed to update revenue:', error);
            toast({
              title: "Error",
              description: error.message || "Failed to prepare payment",
              variant: "destructive",
            });
          }
        };

        return (
          <div className="space-y-6">
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Manifest Created!</h3>
              <p className="text-muted-foreground">
                Review pricing and collect payment
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Breakdown</CardTitle>
                <CardDescription>Based on rates set in the pricing step</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentPteOffRimCount > 0 && parseFloat(pteOffRimRate) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Passenger Off-Rim ({paymentPteOffRimCount} × ${pteOffRimRate})</span>
                    <span className="font-medium">${(paymentPteOffRimCount * parseFloat(pteOffRimRate)).toFixed(2)}</span>
                  </div>
                )}
                {paymentPteOnRimCount > 0 && parseFloat(pteOnRimRate) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Passenger On-Rim ({paymentPteOnRimCount} × ${pteOnRimRate})</span>
                    <span className="font-medium">${(paymentPteOnRimCount * parseFloat(pteOnRimRate)).toFixed(2)}</span>
                  </div>
                )}
                {payment_17_5_19_5_off_count > 0 && parseFloat(commercial_17_5_19_5_off_rate) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span>17.5"/19.5" Off-Rim ({payment_17_5_19_5_off_count} × ${commercial_17_5_19_5_off_rate})</span>
                    <span className="font-medium">${(payment_17_5_19_5_off_count * parseFloat(commercial_17_5_19_5_off_rate)).toFixed(2)}</span>
                  </div>
                )}
                {payment_17_5_19_5_on_count > 0 && parseFloat(commercial_17_5_19_5_on_rate) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span>17.5"/19.5" On-Rim ({payment_17_5_19_5_on_count} × ${commercial_17_5_19_5_on_rate})</span>
                    <span className="font-medium">${(payment_17_5_19_5_on_count * parseFloat(commercial_17_5_19_5_on_rate)).toFixed(2)}</span>
                  </div>
                )}
                {payment_22_5_off_count > 0 && parseFloat(commercial_22_5_off_rate) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span>22.5" Off-Rim ({payment_22_5_off_count} × ${commercial_22_5_off_rate})</span>
                    <span className="font-medium">${(payment_22_5_off_count * parseFloat(commercial_22_5_off_rate)).toFixed(2)}</span>
                  </div>
                )}
                {payment_22_5_on_count > 0 && parseFloat(commercial_22_5_on_rate) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span>22.5" On-Rim ({payment_22_5_on_count} × ${commercial_22_5_on_rate})</span>
                    <span className="font-medium">${(payment_22_5_on_count * parseFloat(commercial_22_5_on_rate)).toFixed(2)}</span>
                  </div>
                )}
                {paymentOtrTotalCount > 0 && parseFloat(otrRate) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span>OTR/Tractor ({paymentOtrTotalCount} × ${otrRate})</span>
                    <span className="font-medium">${(paymentOtrTotalCount * parseFloat(otrRate)).toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount:</span>
                    <span className="text-2xl font-bold text-primary">${calculatedTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Offline payment option */}
            {calculatedTotal > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Offline Payment Method</label>
                <Select value={offlineMethod} onValueChange={(v) => setOfflineMethod(v as 'CASH' | 'CHECK')}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={calculatedTotal <= 0}
                    onClick={async () => {
                      try {
                        if (pickupId) {
                          const { error } = await supabase
                            .from('pickups')
                            .update({
                              computed_revenue: calculatedTotal,
                              final_revenue: calculatedTotal,
                              payment_method: offlineMethod,
                              payment_status: 'SUCCEEDED'
                            })
                            .eq('id', pickupId);
                          if (error) throw error;
                        }
                        toast({ title: 'Marked Paid', description: `Recorded ${offlineMethod.toLowerCase()} payment.` });
                        if (onComplete) onComplete(); else navigate('/driver/manifests');
                      } catch (err: any) {
                        toast({ title: 'Offline Payment Error', description: err?.message || 'Failed to record offline payment', variant: 'destructive' });
                      }
                    }}
                  >
                    Mark Paid Offline
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={paymentMethod === 'CHECK' && !checkNumber.trim()}
                onClick={async () => {
                  // Save check number to both tables if CHECK was selected
                  if (paymentMethod === 'CHECK' && checkNumber.trim() && createdManifestId) {
                    await supabase.from('manifests').update({ check_number: checkNumber.trim() }).eq('id', createdManifestId);
                    if (pickupId) {
                      await supabase.from('pickups').update({ check_number: checkNumber.trim() }).eq('id', pickupId);
                    }
                  }
                  if (onComplete) {
                    onComplete();
                  } else {
                    navigate("/driver/manifests");
                  }
                }}
                className="flex-1"
              >
                Skip Payment
              </Button>
              <Button
                type="button"
                onClick={handleCollectPayment}
                disabled={calculatedTotal <= 0 || (paymentMethod === 'CHECK' && !checkNumber.trim())}
                className="flex-1"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Collect Payment
              </Button>
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
      <CardHeader className="px-3 sm:px-6 py-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg truncate">Create Manifest</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Step {step + 1} of {steps.length}: {currentStep.title}
            </CardDescription>
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-3" />
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="px-3 sm:px-6 py-4">
            <ScrollArea className="h-[calc(100vh-240px)] pr-2 sm:pr-4">
              <div ref={contentScrollRef} className="pb-6">
                {renderStepContent()}
              </div>
            </ScrollArea>
          </CardContent>

          {/* Navigation Buttons */}
          <div className="px-3 sm:px-6 py-4 border-t">
            {currentStep.key !== "payment" && (
              <div className="flex items-center justify-between gap-2 md:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={step === 0 || isSubmitting}
                  className="flex-1 md:flex-none md:min-w-[120px] text-xs sm:text-sm"
                >
                  <ChevronLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  Back
                </Button>

                {currentStep.key === "review" ? (
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 md:flex-none md:min-w-[180px] !bg-green-600 hover:!bg-green-700 !text-white font-semibold disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap"
                    style={{ backgroundColor: '#16a34a', color: 'white' }}
                  >
                    {isSubmitting ? "Creating..." : "Create Manifest"}
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    onClick={handleNext} 
                    disabled={isSubmitting}
                    className="flex-1 md:flex-none md:min-w-[120px] !bg-green-600 hover:!bg-green-700 !text-white font-semibold disabled:opacity-50 text-xs sm:text-sm"
                    style={{ backgroundColor: '#16a34a', color: 'white' }}
                  >
                    Next
                    <ChevronRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </form>
      </Form>

      {/* Payment Dialog */}
      <CollectPaymentWithCard
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        pickupId={pickupId || ''}
        amount={calculatedTotal}
        onSuccess={() => {
          setShowPaymentDialog(false);
          if (onComplete) {
            onComplete();
          } else {
            navigate("/driver/manifests");
          }
        }}
      />
    </Card>
  );
}
