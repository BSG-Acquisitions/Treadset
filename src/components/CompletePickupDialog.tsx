import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableDropdown } from "./SearchableDropdown";
import { useToast } from "@/hooks/use-toast";
import { useCreateManifest } from "@/hooks/useManifests";
import { useManifestIntegration } from "@/hooks/useManifestIntegration";
import { ManifestPDFControls } from "./ManifestPDFControls";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Calendar, MapPin, Building, DollarSign, Weight, FileText, PenTool } from "lucide-react";
import SignaturePad from 'react-signature-canvas';

// Mock data - replace with actual database calls
interface Generator {
  id: string;
  generator_name: string;
  generator_mailing_address?: string;
  generator_city?: string;
  generator_state?: string;
  generator_zip?: string;
}

interface Hauler {
  id: string;
  hauler_name: string;
  hauler_mailing_address?: string;
  hauler_city?: string;
  hauler_state?: string;
  hauler_zip?: string;
  hauler_mi_reg?: string;
}

interface Receiver {
  id: string;
  receiver_name: string;
  receiver_mailing_address?: string;
  receiver_city?: string;
  receiver_state?: string;
  receiver_zip?: string;
}

const completePickupSchema = z.object({
  // Passenger car tires (PTE = 1:1)  
  equivalents_off_rim: z.number().min(0, "Passenger car tires off rim count must be 0 or greater"),
  equivalents_on_rim: z.number().min(0, "Passenger car tires on rim count must be 0 or greater"),
  
  // Commercial/truck tires (different PTE ratios)
  commercial_17_5_19_5_off: z.number().min(0, "Truck 17.5/19.5 off rim count must be 0 or greater"),
  commercial_17_5_19_5_on: z.number().min(0, "Truck 17.5/19.5 on rim count must be 0 or greater"),
  commercial_22_5_off: z.number().min(0, "Truck 22.5 off rim count must be 0 or greater"),
  commercial_22_5_on: z.number().min(0, "Truck 22.5 on rim count must be 0 or greater"),
  
  // Oversized (OTR + Tractor) - higher PTE ratios
  otr_count: z.number().min(0, "OTR count must be 0 or greater"),
  tractor_count: z.number().min(0, "Tractor count must be 0 or greater"),
  
  // Measurements
  weight_tons: z.number().min(0, "Weight must be 0 or greater").optional(),
  volume_yards: z.number().min(0, "Volume must be 0 or greater").optional(),
  
  // Manifest data
  generator_id: z.string().min(1, "Generator is required"),
  hauler_id: z.string().min(1, "Hauler is required"),
  receiver_id: z.string().min(1, "Receiver is required"),
  generator_print_name: z.string().min(1, "Generator print name is required"),
  hauler_print_name: z.string().min(1, "Hauler print name is required"),
  gross_weight: z.number().min(0, "Gross weight must be 0 or greater"),
  tare_weight: z.number().min(0, "Tare weight must be 0 or greater"),
  
  notes: z.string().optional(),
});

type CompletePickupFormData = z.infer<typeof completePickupSchema>;

interface CompletePickupDialogProps {
  pickup: {
    id: string;
    client?: { 
      id?: string;
      company_name: string;
      contact_name?: string;
      email?: string;
      phone?: string;
    };
    location?: { 
      id?: string;
      name?: string; 
      address: string; 
    };
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
  const [selectedGenerator, setSelectedGenerator] = useState<Generator | null>(null);
  const [selectedHauler, setSelectedHauler] = useState<Hauler | null>(null);
  const [selectedReceiver, setSelectedReceiver] = useState<Receiver | null>(null);
  const [completedManifest, setCompletedManifest] = useState<{ id: string; acroform_pdf_path?: string } | null>(null);
  
  const generatorSigRef = useRef<SignaturePad>(null);
  const haulerSigRef = useRef<SignaturePad>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createManifest = useCreateManifest();
  const manifestIntegration = useManifestIntegration();

  // Auto-populate generator with client data when dialog opens
  useEffect(() => {
    if (open && pickup.client) {
      setSelectedGenerator({
        id: 'client-' + pickup.id,
        generator_name: pickup.client.company_name,
        generator_mailing_address: pickup.location?.address,
        generator_city: '', // These would need to be parsed from address or fetched from client data
        generator_state: '',
        generator_zip: ''
      });
    }
  }, [open, pickup]);

  // Fetch functions for real database data
  const fetchGenerators = async (search: string): Promise<Generator[]> => {
    const { data, error } = await supabase
      .from('generators' as any)
      .select('*')
      .ilike('generator_name', `%${search}%`)
      .eq('is_active', true)
      .limit(10);
    
    if (error) {
      console.error('Error fetching generators:', error);
      return [];
    }
    
    return (data || []).map((item: any) => ({
      id: item.id,
      generator_name: item.generator_name,
      generator_mailing_address: item.generator_mailing_address,
      generator_city: item.generator_city,
      generator_state: item.generator_state,
      generator_zip: item.generator_zip
    }));
  };

  const fetchHaulers = async (search: string): Promise<Hauler[]> => {
    const { data, error } = await supabase
      .from('haulers' as any)
      .select('*')
      .ilike('hauler_name', `%${search}%`)
      .eq('is_active', true)
      .limit(10);
    
    if (error) {
      console.error('Error fetching haulers:', error);
      return [];
    }
    
    return (data || []).map((item: any) => ({
      id: item.id,
      hauler_name: item.hauler_name,
      hauler_mailing_address: item.hauler_mailing_address,
      hauler_city: item.hauler_city,
      hauler_state: item.hauler_state,
      hauler_zip: item.hauler_zip,
      hauler_mi_reg: item.hauler_mi_reg
    }));
  };

  const fetchReceivers = async (search: string): Promise<Receiver[]> => {
    const { data, error } = await supabase
      .from('receivers' as any)
      .select('*')
      .ilike('receiver_name', `%${search}%`)
      .eq('is_active', true)
      .limit(10);
    
    if (error) {
      console.error('Error fetching receivers:', error);
      return [];
    }
    
    return (data || []).map((item: any) => ({
      id: item.id,
      receiver_name: item.receiver_name,
      receiver_mailing_address: item.receiver_mailing_address,
      receiver_city: item.receiver_city,
      receiver_state: item.receiver_state,
      receiver_zip: item.receiver_zip
    }));
  };

  const form = useForm<CompletePickupFormData>({
    resolver: zodResolver(completePickupSchema),
    defaultValues: {
      equivalents_off_rim: pickup.pte_count || 0,
      equivalents_on_rim: 0,
      commercial_17_5_19_5_off: 0,
      commercial_17_5_19_5_on: 0,
      commercial_22_5_off: 0,
      commercial_22_5_on: 0,
      otr_count: pickup.otr_count || 0,
      tractor_count: pickup.tractor_count || 0,
      weight_tons: 0,
      volume_yards: 0,
      generator_id: '',
      hauler_id: '',
      receiver_id: '',
      generator_print_name: pickup.client?.contact_name || '',
      hauler_print_name: '',
      gross_weight: 0,
      tare_weight: 0,
      notes: pickup.notes || "",
    },
  });

  const customPricing = false; // Removed custom pricing for simplified flow
  const grossWeight = form.watch("gross_weight");
  const tareWeight = form.watch("tare_weight");
  const netWeight = grossWeight - tareWeight;

  // Update hidden fields when selections change
  useEffect(() => {
    if (selectedGenerator) {
      form.setValue("generator_id", selectedGenerator.id);
    }
  }, [selectedGenerator, form]);

  useEffect(() => {
    if (selectedHauler) {
      form.setValue("hauler_id", selectedHauler.id);
    }
  }, [selectedHauler, form]);

  useEffect(() => {
    if (selectedReceiver) {
      form.setValue("receiver_id", selectedReceiver.id);
    }
  }, [selectedReceiver, form]);

  // Utility function to calculate tire equivalents based on standard conversions
  const calculateEquivalents = (data: CompletePickupFormData) => {
    // Standard tire-to-equivalent conversions
    const passengerEquivalents = data.equivalents_off_rim + data.equivalents_on_rim;
    const commercialEquivalents = (data.commercial_17_5_19_5_off + data.commercial_17_5_19_5_on) * 2 + 
                                 (data.commercial_22_5_off + data.commercial_22_5_on) * 2.5;
    const oversizedEquivalents = data.otr_count * 4 + data.tractor_count * 3;
    
    return {
      passengerEquivalents,
      commercialEquivalents, 
      oversizedEquivalents,
      totalEquivalents: passengerEquivalents + commercialEquivalents + oversizedEquivalents
    };
  };

  const saveSignature = async (type: string, sigRef: React.RefObject<SignaturePad>) => {
    if (!sigRef.current || sigRef.current.isEmpty()) return null;

    try {
      const signatureDataUrl = sigRef.current.toDataURL();
      const signatureBlob = await fetch(signatureDataUrl).then(r => r.blob());
      
      const fileName = `${type}_signature_${Date.now()}.png`;
      const { data, error } = await supabase.storage
        .from('manifests')
        .upload(`signatures/${fileName}`, signatureBlob, {
          contentType: 'image/png'
        });

      if (error) throw error;
      // Be resilient to different return shapes (path, fullPath, Key)
      const rawPath = (data as any)?.path || (data as any)?.fullPath || (data as any)?.Key || '';
      const normalized = String(rawPath).replace(/^manifests\//, '').replace(/^\/+/, '');
      if (!normalized) throw new Error(`Upload returned empty path for ${type} signature`);
      return normalized;
    } catch (error) {
      console.error(`Error saving ${type} signature:`, error);
      return null;
    }
  };

  const onSubmit = async (data: CompletePickupFormData) => {
    setIsSubmitting(true);
    try {
      // Validate required fields
      const missingFields = [];
      if (!selectedGenerator) missingFields.push("Generator");
      if (!selectedHauler) missingFields.push("Hauler");
      if (!selectedReceiver) missingFields.push("Receiver");
      
      // Check for signatures
      const generatorSig = generatorSigRef.current?.isEmpty();
      const haulerSig = haulerSigRef.current?.isEmpty();
      
      if (generatorSig !== false) missingFields.push("Generator Signature");
      if (haulerSig !== false) missingFields.push("Hauler Signature");
      
      if (missingFields.length > 0) {
        toast({
          title: "Missing Information",
          description: `Please provide: ${missingFields.join(", ")}`,
          variant: "destructive"
        });
        return;
      }

      // Save signatures to storage
      const generatorSigPath = await saveSignature('generator', generatorSigRef);
      const haulerSigPath = await saveSignature('hauler', haulerSigRef);

      if (!generatorSigPath || !haulerSigPath) {
        throw new Error('Could not save one or more signature images (generator/hauler). Please re-sign and try again.');
      }

      // Calculate tire equivalents
      const equivalents = calculateEquivalents(data);

      // Update pickup status
      const { error: pickupError } = await supabase
        .from('pickups')
        .update({
          pte_count: equivalents.totalEquivalents,
          otr_count: data.otr_count,
          tractor_count: data.tractor_count,
          notes: data.notes,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pickup.id);

      if (pickupError) throw pickupError;

      // Ensure we have client_id and location_id from DB
      const { data: pickupRef, error: pickupRefErr } = await supabase
        .from('pickups')
        .select('client_id, location_id')
        .eq('id', pickup.id)
        .single();
      if (pickupRefErr) throw pickupRefErr;

      // Create manifest record
      const manifestData = {
        pickup_id: pickup.id,
        client_id: pickupRef?.client_id || pickup.client?.id || null,
        location_id: pickupRef?.location_id || pickup.location?.id || null,
        
        // Tire counts
        pte_off_rim: data.equivalents_off_rim,
        pte_on_rim: data.equivalents_on_rim,
        commercial_17_5_19_5_off: data.commercial_17_5_19_5_off,
        commercial_17_5_19_5_on: data.commercial_17_5_19_5_on,
        commercial_22_5_off: data.commercial_22_5_off,
        commercial_22_5_on: data.commercial_22_5_on,
        otr_count: data.otr_count,
        tractor_count: data.tractor_count,
        
        // Weights
        weight_tons: data.weight_tons,
        volume_yards: data.volume_yards,
        
        // Signatures
        customer_sig_path: generatorSigPath,
        driver_sig_path: haulerSigPath,
        
        // Print names
        signed_by_name: data.generator_print_name,
        
        status: 'AWAITING_RECEIVER_SIGNATURE',
        signed_at: new Date().toISOString()
      };

      const manifest = await createManifest.mutateAsync(manifestData);
      
      // Build AcroForm overrides directly from the UI selections
      const today = new Date().toISOString().split('T')[0];
      const net = (data.gross_weight - data.tare_weight).toFixed(1);
      const overrides = {
        // Generator
        generator_name: selectedGenerator?.generator_name,
        generator_mail_address: selectedGenerator?.generator_mailing_address || pickup.location?.address,
        generator_city: selectedGenerator?.generator_city,
        generator_state: selectedGenerator?.generator_state,
        generator_zip: selectedGenerator?.generator_zip,
        generator_physical_address: pickup.location?.address || selectedGenerator?.generator_mailing_address,
        generator_print_name: data.generator_print_name,
        generator_date: today,
        // Hauler
        hauler_mi_reg: selectedHauler?.hauler_mi_reg,
        hauler_name: selectedHauler?.hauler_name,
        hauler_mail_address: selectedHauler?.hauler_mailing_address,
        hauler_city: selectedHauler?.hauler_city,
        hauler_state: selectedHauler?.hauler_state,
        hauler_zip: selectedHauler?.hauler_zip,
        hauler_print_name: data.hauler_print_name,
        hauler_date: today,
        hauler_gross_weight: String(data.gross_weight || ''),
        hauler_tare_weight: String(data.tare_weight || ''),
        hauler_net_weight: String(net || ''),
        hauler_total_pte: String(equivalents.totalEquivalents),
        // Receiver
        receiver_name: selectedReceiver?.receiver_name,
        receiver_physical_address: selectedReceiver?.receiver_mailing_address,
        receiver_city: selectedReceiver?.receiver_city,
        receiver_state: selectedReceiver?.receiver_state,
        receiver_zip: selectedReceiver?.receiver_zip,
        // Signatures
        generator_signature: generatorSigPath,
        hauler_signature: haulerSigPath,
      } as any;
      
      // Generate AcroForm PDF with overrides
      const genResult = await manifestIntegration.mutateAsync({ manifestId: manifest.id, overrides });
      
      setCompletedManifest({ 
        id: manifest.id, 
        acroform_pdf_path: genResult.pdfPath 
      });

      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to complete pickup",
        variant: "destructive"
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-brand-success" />
            Complete Pickup & Generate Manifest
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
            <div className="space-y-6">
              {/* Manifest Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Manifest Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                 <div className="p-3 bg-muted rounded-lg">
                   <div className="text-sm">
                     <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                     <p><strong>Pickup:</strong> {pickup.client?.company_name}</p>
                     <p><strong>Location:</strong> {pickup.location?.address}</p>
                   </div>
                 </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gross_weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gross Weight (lbs) *</FormLabel>
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
                    name="tare_weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tare Weight (lbs) *</FormLabel>
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

                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Net Weight: {netWeight.toFixed(1)} lbs</div>
                </div>
              </CardContent>
            </Card>

            {/* Generator, Hauler, Receiver Selection */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generator</CardTitle>
                </CardHeader>
                <CardContent>
                  <SearchableDropdown
                    placeholder="Search generators..."
                    searchFunction={fetchGenerators}
                    onSelect={setSelectedGenerator}
                    displayField="generator_name"
                    selected={selectedGenerator}
                    className="w-full"
                  />
                  {selectedGenerator && (
                    <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1">
                      <div><strong>Name:</strong> {selectedGenerator.generator_name}</div>
                      {selectedGenerator.generator_mailing_address && (
                        <div><strong>Address:</strong> {selectedGenerator.generator_mailing_address}</div>
                      )}
                      {selectedGenerator.generator_city && (
                        <div><strong>Location:</strong> {selectedGenerator.generator_city}, {selectedGenerator.generator_state} {selectedGenerator.generator_zip}</div>
                      )}
                    </div>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="generator_print_name"
                    render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Print Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Name to print on manifest" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hauler</CardTitle>
                </CardHeader>
                <CardContent>
                  <SearchableDropdown
                    placeholder="Search haulers..."
                    searchFunction={fetchHaulers}
                    onSelect={setSelectedHauler}
                    displayField="hauler_name"
                    selected={selectedHauler}
                    className="w-full"
                  />
                  {selectedHauler && (
                    <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1">
                      <div><strong>Name:</strong> {selectedHauler.hauler_name}</div>
                      {selectedHauler.hauler_mailing_address && (
                        <div><strong>Address:</strong> {selectedHauler.hauler_mailing_address}</div>
                      )}
                      {selectedHauler.hauler_city && (
                        <div><strong>Location:</strong> {selectedHauler.hauler_city}, {selectedHauler.hauler_state} {selectedHauler.hauler_zip}</div>
                      )}
                      {selectedHauler.hauler_mi_reg && (
                        <div><strong>MI Reg:</strong> {selectedHauler.hauler_mi_reg}</div>
                      )}
                    </div>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="hauler_print_name"
                    render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Print Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Name to print on manifest" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Receiver</CardTitle>
                </CardHeader>
                <CardContent>
                  <SearchableDropdown
                    placeholder="Search receivers..."
                    searchFunction={fetchReceivers}
                    onSelect={setSelectedReceiver}
                    displayField="receiver_name"
                    selected={selectedReceiver}
                    className="w-full"
                  />
                  {selectedReceiver && (
                    <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1">
                      <div><strong>Name:</strong> {selectedReceiver.receiver_name}</div>
                      {selectedReceiver.receiver_mailing_address && (
                        <div><strong>Address:</strong> {selectedReceiver.receiver_mailing_address}</div>
                      )}
                      {selectedReceiver.receiver_city && (
                        <div><strong>Location:</strong> {selectedReceiver.receiver_city}, {selectedReceiver.receiver_state} {selectedReceiver.receiver_zip}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Signature Pads */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Signatures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">Generator Signature</label>
                    <div className="border rounded-lg mt-2">
                      <SignaturePad
                        ref={generatorSigRef}
                        canvasProps={{
                          width: 300,
                          height: 150,
                          className: 'signature-canvas w-full'
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => generatorSigRef.current?.clear()}
                    >
                      Clear
                    </Button>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Hauler Signature</label>
                    <div className="border rounded-lg mt-2">
                      <SignaturePad
                        ref={haulerSigRef}
                        canvasProps={{
                          width: 300,
                          height: 150,
                          className: 'signature-canvas w-full'
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => haulerSigRef.current?.clear()}
                    >
                      Clear
                    </Button>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Tire Counts */}
            <div className="space-y-6">
              {/* Passenger Car Tires */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <span>🚗</span> Passenger Car Tires (PTE = 1:1)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="equivalents_off_rim"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passenger Car Off Rim</FormLabel>
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
                    name="equivalents_on_rim"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passenger Car On Rim</FormLabel>
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

              {/* Truck Tires */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <span>🚛</span> Truck Tires (Commercial)
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="commercial_17_5_19_5_off"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Truck 17.5/19.5 Off Rim</FormLabel>
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
                          <FormLabel>Truck 17.5/19.5 On Rim</FormLabel>
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
                          <FormLabel>Truck 22.5 Off Rim</FormLabel>
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
                          <FormLabel>Truck 22.5 On Rim</FormLabel>
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

              {/* Oversized Tires */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <span>🏗️</span> Oversized Tires
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

              {/* Total PTE Calculation */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <span>🔢</span> Total Passenger Tire Equivalents (PTE)
                </h3>
                <div className="bg-primary/5 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {(() => {
                        const formValues = form.watch();
                        // Calculate total PTE (simplified calculation - adjust ratios as needed)
                        const passengerPTE = (formValues.equivalents_off_rim || 0) + (formValues.equivalents_on_rim || 0);
                        const truckPTE = ((formValues.commercial_17_5_19_5_off || 0) + (formValues.commercial_17_5_19_5_on || 0)) * 3 + 
                                        ((formValues.commercial_22_5_off || 0) + (formValues.commercial_22_5_on || 0)) * 5;
                        const oversizedPTE = (formValues.otr_count || 0) * 8 + (formValues.tractor_count || 0) * 8;
                        return passengerPTE + truckPTE + oversizedPTE;
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Total PTE (Passenger Car × 1) + (Truck × 3-5) + (Oversized × 8)
                    </div>
                  </div>
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

              {/* Tire Conversion Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Tire Equivalent Summary
                </h3>
                <div className="p-4 bg-secondary/10 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Passenger Tires</div>
                      <div>Total: {form.watch("equivalents_off_rim") + form.watch("equivalents_on_rim")} equivalents</div>
                    </div>
                    <div>
                      <div className="font-medium">Commercial/Truck</div>
                      <div>Total: {((form.watch("commercial_17_5_19_5_off") + form.watch("commercial_17_5_19_5_on")) * 2 + 
                                   (form.watch("commercial_22_5_off") + form.watch("commercial_22_5_on")) * 2.5).toFixed(1)} equivalents</div>
                    </div>
                    <div>
                      <div className="font-medium">Oversized</div>
                      <div>Total: {(form.watch("otr_count") * 4 + form.watch("tractor_count") * 3)} equivalents</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="font-semibold">
                      Grand Total: {(
                        form.watch("equivalents_off_rim") + form.watch("equivalents_on_rim") +
                        ((form.watch("commercial_17_5_19_5_off") + form.watch("commercial_17_5_19_5_on")) * 2) +
                        ((form.watch("commercial_22_5_off") + form.watch("commercial_22_5_on")) * 2.5) +
                        (form.watch("otr_count") * 4) + (form.watch("tractor_count") * 3)
                      ).toFixed(1)} tire equivalents
                    </div>
                  </div>
                </div>
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
            </div>

            {/* PDF Controls - Show after successful generation */}
            {completedManifest && (
              <div className="bg-brand-success/10 border border-brand-success/20 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-brand-success" />
                  <h3 className="font-semibold text-brand-success">Pickup Completed & Manifest Generated!</h3>
                </div>
                <ManifestPDFControls
                  manifestId={completedManifest.id}
                  acroformPdfPath={completedManifest.acroform_pdf_path}
                  clientEmails={pickup.client?.email ? [pickup.client.email] : []}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || completedManifest !== null} 
                className="bg-brand-success hover:bg-brand-success/90"
              >
                {isSubmitting ? "Processing..." : completedManifest ? "Completed" : "Complete Pickup & Generate Manifest"}
              </Button>
            </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
