import React, { useState, useEffect, useRef } from "react";
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
  FileText
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

import { DollarSign } from "lucide-react";

const steps = [
  { key: "info", title: "Review Info", icon: Building },
  { key: "tires", title: "Tire Counts", icon: Package },
  { key: "pricing", title: "Pricing Preview", icon: DollarSign },
  { key: "signatures", title: "Signatures", icon: PenTool },
  { key: "review", title: "Review & Submit", icon: CheckCircle },
  { key: "payment", title: "Payment", icon: DollarSign },
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
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [manualWeightOverride, setManualWeightOverride] = useState<boolean>(false);
  const [manifestCreated, setManifestCreated] = useState(false);
  const [createdManifestId, setCreatedManifestId] = useState<string | null>(null);
  const [pteOffRimRate, setPteOffRimRate] = useState<string>("");
  const [pteOnRimRate, setPteOnRimRate] = useState<string>("");
  const [commercialOffRimRate, setCommercialOffRimRate] = useState<string>("");
  const [commercialOnRimRate, setCommercialOnRimRate] = useState<string>("");
  const [otrRate, setOtrRate] = useState<string>("");
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [offlineMethod, setOfflineMethod] = useState<'CASH' | 'CHECK'>('CASH');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  
  // Use ref for more reliable duplicate prevention
  const isSubmittingRef = useRef(false);

  const PRESET_RATES = {
    passengerOffRim: ['2.50', '2.75', '3.00', '3.25', '3.50'],
    passengerOnRim: ['3.00', '3.25', '3.50', '3.75', '4.00'],
    commercialOffRim: ['10.00', '11.00', '12.00', '13.00', '14.00', '15.00', '16.00', '17.00', '18.00', '19.00', '20.00'],
    commercialOnRim: ['12.00', '13.00', '14.00', '15.00', '16.00', '17.00', '18.00', '19.00', '20.00', '21.00', '22.00'],
    otr: ['50.00', '70.00', '90.00', '110.00', '130.00', '150.00']
  };
  
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
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [genSigPath, setGenSigPath] = useState<string>('');
  const [haulSigPath, setHaulSigPath] = useState<string>('');
  const [genSigDataUrl, setGenSigDataUrl] = useState<string>('');
  const [haulSigDataUrl, setHaulSigDataUrl] = useState<string>('');
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
      const commercialOffRimCount = (formValues.commercial_17_5_19_5_off || 0) + (formValues.commercial_22_5_off || 0);
      const commercialOnRimCount = (formValues.commercial_17_5_19_5_on || 0) + (formValues.commercial_22_5_on || 0);
      const otrTotalCount = (formValues.otr_count || 0) + (formValues.tractor_count || 0);

      const pteOffRimAmount = pteOffRimCount * (parseFloat(pteOffRimRate) || 0);
      const pteOnRimAmount = pteOnRimCount * (parseFloat(pteOnRimRate) || 0);
      const commercialOffRimAmount = commercialOffRimCount * (parseFloat(commercialOffRimRate) || 0);
      const commercialOnRimAmount = commercialOnRimCount * (parseFloat(commercialOnRimRate) || 0);
      const otrAmount = otrTotalCount * (parseFloat(otrRate) || 0);
      
      setCalculatedTotal(pteOffRimAmount + pteOnRimAmount + commercialOffRimAmount + commercialOnRimAmount + otrAmount);
    }
  }, [pteOffRimRate, pteOnRimRate, commercialOffRimRate, commercialOnRimRate, otrRate, step, form]);

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

  // Blur any active input to prevent the Android keyboard from staying open when signing
  const blurActiveInputs = () => {
    const ae = document.activeElement as HTMLElement | null;
    if (ae && typeof ae.blur === 'function') {
      ae.blur();
    }
  };

  const handleNext = async () => {
    // CRITICAL: Validate hauler at EVERY step to prevent bypassing
    if (!haulerData) {
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
        toast({
          title: "Hauler Required",
          description: "Please select a hauler company before continuing",
          variant: "destructive",
        });
        return;
      }
      
      // Ensure hauler has required fields
      if (!haulerData.company_name || !haulerData.hauler_mi_reg) {
        toast({
          title: "Incomplete Hauler Information",
          description: "The selected hauler is missing required information (company name or MI registration). Please contact your administrator.",
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

    if (currentStep.key === "pricing") {
      const values = form.getValues();
      const pteOffRimCount = values.pte_off_rim || 0;
      const pteOnRimCount = values.pte_on_rim || 0;
      const commercialOffRimCount = (values.commercial_17_5_19_5_off || 0) + (values.commercial_22_5_off || 0);
      const commercialOnRimCount = (values.commercial_17_5_19_5_on || 0) + (values.commercial_22_5_on || 0);
      const otrTotalCount = (values.otr_count || 0) + (values.tractor_count || 0);

      // Validate that rates are set for tire types that have counts
      if (pteOffRimCount > 0 && (!pteOffRimRate || parseFloat(pteOffRimRate) <= 0)) {
        toast({
          title: "Missing Rate",
          description: "Please set a rate for Passenger Off-Rim tires",
          variant: "destructive",
        });
        return;
      }

      if (pteOnRimCount > 0 && (!pteOnRimRate || parseFloat(pteOnRimRate) <= 0)) {
        toast({
          title: "Missing Rate",
          description: "Please set a rate for Passenger On-Rim tires",
          variant: "destructive",
        });
        return;
      }

      if (commercialOffRimCount > 0 && (!commercialOffRimRate || parseFloat(commercialOffRimRate) <= 0)) {
        toast({
          title: "Missing Rate",
          description: "Please set a rate for Commercial Off-Rim tires",
          variant: "destructive",
        });
        return;
      }

      if (commercialOnRimCount > 0 && (!commercialOnRimRate || parseFloat(commercialOnRimRate) <= 0)) {
        toast({
          title: "Missing Rate",
          description: "Please set a rate for Commercial On-Rim tires",
          variant: "destructive",
        });
        return;
      }

      if (otrTotalCount > 0 && (!otrRate || parseFloat(otrRate) <= 0)) {
        toast({
          title: "Missing Rate",
          description: "Please set a rate for OTR/Tractor tires",
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
          const dataUrl = generatorSigRef.current.toDataURL();
          setGenSigDataUrl(dataUrl); // Store data URL for restoration
          const generatorBlob = await fetch(dataUrl).then(r => r.blob());
          const generatorFileName = `signatures/${timestamp}-generator.png`;
          const { error: genUploadError } = await supabase.storage
            .from('manifests')
            .upload(generatorFileName, generatorBlob, { contentType: 'image/png', upsert: true });
          if (genUploadError) throw genUploadError;
          setGenSigPath(generatorFileName);
        }

        if (haulerSigRef.current && !haulSigPath) {
          const dataUrl = haulerSigRef.current.toDataURL();
          setHaulSigDataUrl(dataUrl); // Store data URL for restoration
          const haulerBlob = await fetch(dataUrl).then(r => r.blob());
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
      
      // Ensure we have a valid client
      if (!pickupData.client || !pickupData.client.company_name) {
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

    // Check if a manifest already exists for this pickup (prevents duplicates)
    const { data: existingManifests, error: checkError } = await supabase
      .from('manifests')
      .select('id, manifest_number, status')
      .eq('pickup_id', pickupId)
      .limit(1);

    if (checkError) {
      console.error('[DRIVER_WIZARD] Error checking for existing manifests:', checkError);
    } else if (existingManifests && existingManifests.length > 0) {
      const existing = existingManifests[0];
      toast({
        title: "Manifest Already Exists",
        description: `A manifest (${existing.manifest_number}) has already been created for this pickup.`,
        variant: "destructive",
      });
      console.log('[DRIVER_WIZARD] Manifest already exists:', existing);
      
      // If the manifest exists and is completed or awaiting receiver, proceed to payment
      if (existing.status === 'COMPLETED' || existing.status === 'AWAITING_RECEIVER_SIGNATURE') {
        setCreatedManifestId(existing.id);
        setManifestCreated(true);
        setStep(step + 1);
      }
      return;
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
      
        // Net weight = Gross - Tare (for scrap tires with tare=0, net=gross)
      const finalNet = Math.max(0, finalGross - finalTare);
      
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

      // Validate client_id before creating manifest
      if (!resolvedClientId) {
        toast({
          title: 'Missing Client Information',
          description: 'Cannot create manifest without a valid client ID.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const manifestData = {
        client_id: resolvedClientId,
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
        payment_method: requiresInvoice ? ('INVOICE' as const) : ('CARD' as const),
        payment_status: requiresInvoice ? ('PENDING' as const) : ('PENDING' as const),
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
          signed_by_title: data.hauler_print_name, // Store hauler's print name in title field
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
        }
      });

      // 5. Email the initial manifest to client
      if (pickupData.client.email) {
        console.log('📧 Attempting to send manifest email to:', pickupData.client.email);
        try {
          await sendEmail.mutateAsync({
            manifestId: manifest.id,
            to: pickupData.client.email,
            subject: `Tire Manifest - ${pickupData.client.company_name}`,
            messageHtml: `<p>Your tire pickup manifest is attached. This is the initial manifest with generator and hauler signatures. A final version will be sent once the receiver has signed.</p>`,
          });
          console.log('✅ Email sent successfully to:', pickupData.client.email);
        } catch (emailError: any) {
          console.error('❌ Email sending failed:', emailError);
          toast({
            title: "Email Warning",
            description: `Manifest created but email failed: ${emailError.message || 'Unknown error'}`,
            variant: "destructive",
          });
        }
      } else {
        console.warn('⚠️ No email address for client:', pickupData.client.company_name);
        toast({
          title: "No Email Address",
          description: `Manifest created but ${pickupData.client.company_name} has no email address configured.`,
          variant: "destructive",
        });
      }

      toast({
        title: "Success",
        description: requiresInvoice 
          ? "Manifest created - marked for invoicing"
          : "Manifest created successfully with generator and hauler signatures",
      });

      // Update pickup status to completed
      await supabase
        .from('pickups')
        .update({ 
          status: 'completed',
          manifest_id: manifest.id 
        })
        .eq('id', pickupId);

      // Ensure manifest PDF is generated and linked
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

      // Store manifest ID and mark as created
      setCreatedManifestId(manifest.id);
      setManifestCreated(true);
      
      // Skip payment step if invoice customer, otherwise proceed to payment
      if (requiresInvoice) {
        // Complete the wizard for invoice customers
        if (onComplete) {
          onComplete();
        } else {
          navigate("/driver/manifests");
        }
      } else {
        // Move to payment step for non-invoice customers
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
                        <Select onValueChange={(value) => {
                          const selected = haulers.find(h => h.id === value);
                          if (selected) {
                            // Validate the hauler has required fields
                            if (!selected.company_name || !selected.hauler_mi_reg) {
                              toast({
                                title: "Incomplete Hauler",
                                description: "This hauler is missing required information. Please contact your administrator.",
                                variant: "destructive",
                              });
                              return;
                            }
                            setHaulerData(selected);
                            toast({
                              title: "Hauler Selected",
                              description: `${selected.company_name} has been selected.`,
                            });
                          }
                        }}>
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
                      ✓ Weights auto-calculated based on Michigan conversions
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
        const commercialOffRimCount = (formValues.commercial_17_5_19_5_off || 0) + (formValues.commercial_22_5_off || 0);
        const commercialOnRimCount = (formValues.commercial_17_5_19_5_on || 0) + (formValues.commercial_22_5_on || 0);
        const otrTotalCount = (formValues.otr_count || 0) + (formValues.tractor_count || 0);

        const pteOffRimAmount = pteOffRimCount * (parseFloat(pteOffRimRate) || 0);
        const pteOnRimAmount = pteOnRimCount * (parseFloat(pteOnRimRate) || 0);
        const commercialOffRimAmount = commercialOffRimCount * (parseFloat(commercialOffRimRate) || 0);
        const commercialOnRimAmount = commercialOnRimCount * (parseFloat(commercialOnRimRate) || 0);
        const otrAmount = otrTotalCount * (parseFloat(otrRate) || 0);
        const previewTotal = pteOffRimAmount + pteOnRimAmount + commercialOffRimAmount + commercialOnRimAmount + otrAmount;

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
                      <Select value={pteOffRimRate} onValueChange={setPteOffRimRate}>
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
                        type="number"
                        step="0.01"
                        min="0"
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
                      <Select value={pteOnRimRate} onValueChange={setPteOnRimRate}>
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
                        type="number"
                        step="0.01"
                        min="0"
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

              {commercialOffRimCount > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Commercial Off-Rim ({commercialOffRimCount} tires)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quick Select Rate</Label>
                      <Select value={commercialOffRimRate} onValueChange={setCommercialOffRimRate}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select preset rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.commercialOffRim.map((rate) => (
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
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={commercialOffRimRate}
                        onChange={(e) => setCommercialOffRimRate(e.target.value)}
                        className="text-base font-medium"
                      />
                    </div>
                    {commercialOffRimAmount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold">${commercialOffRimAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {commercialOnRimCount > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Commercial On-Rim ({commercialOnRimCount} tires)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quick Select Rate</Label>
                      <Select value={commercialOnRimRate} onValueChange={setCommercialOnRimRate}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select preset rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {PRESET_RATES.commercialOnRim.map((rate) => (
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
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={commercialOnRimRate}
                        onChange={(e) => setCommercialOnRimRate(e.target.value)}
                        className="text-base font-medium"
                      />
                    </div>
                    {commercialOnRimAmount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold">${commercialOnRimAmount.toFixed(2)}</span>
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
                      <Select value={otrRate} onValueChange={setOtrRate}>
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
                        type="number"
                        step="0.01"
                        min="0"
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
                  {genSigPath && (
                    <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle className="h-3 w-3" />
                      Signature saved
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
                  {haulSigPath && (
                    <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle className="h-3 w-3" />
                      Signature saved
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
        const paymentCommercialOffRimCount = (paymentFormValues.commercial_17_5_19_5_off || 0) + (paymentFormValues.commercial_22_5_off || 0);
        const paymentCommercialOnRimCount = (paymentFormValues.commercial_17_5_19_5_on || 0) + (paymentFormValues.commercial_22_5_on || 0);
        const paymentOtrTotalCount = (paymentFormValues.otr_count || 0) + (paymentFormValues.tractor_count || 0);

        const handleCollectPayment = async () => {
          if (calculatedTotal <= 0) {
            toast({
              title: "Invalid Total",
              description: "Total amount must be greater than $0",
              variant: "destructive",
            });
            return;
          }

          try {
            // Update the pickup with computed_revenue
            const { error } = await supabase
              .from('pickups')
              .update({ computed_revenue: calculatedTotal })
              .eq('id', pickupId);

            if (error) throw error;

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
                {paymentCommercialOffRimCount > 0 && parseFloat(commercialOffRimRate) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Commercial Off-Rim ({paymentCommercialOffRimCount} × ${commercialOffRimRate})</span>
                    <span className="font-medium">${(paymentCommercialOffRimCount * parseFloat(commercialOffRimRate)).toFixed(2)}</span>
                  </div>
                )}
                {paymentCommercialOnRimCount > 0 && parseFloat(commercialOnRimRate) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Commercial On-Rim ({paymentCommercialOnRimCount} × ${commercialOnRimRate})</span>
                    <span className="font-medium">${(paymentCommercialOnRimCount * parseFloat(commercialOnRimRate)).toFixed(2)}</span>
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
                onClick={() => {
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
                disabled={calculatedTotal <= 0}
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
        pickupId={pickupId}
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
