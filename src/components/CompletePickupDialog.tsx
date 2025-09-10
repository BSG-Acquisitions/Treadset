import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchableDropdown } from "./SearchableDropdown";
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
  
  // Manifest data
  manifest_number: z.string().min(1, "Manifest number is required"),
  generator_id: z.string().min(1, "Generator is required"),
  hauler_id: z.string().min(1, "Hauler is required"),
  receiver_id: z.string().min(1, "Receiver is required"),
  generator_date: z.string().min(1, "Generator date is required"),
  receiver_date: z.string().min(1, "Receiver date is required"),
  generator_print_name: z.string().min(1, "Generator print name is required"),
  hauler_print_name: z.string().min(1, "Hauler print name is required"),
  receiver_print_name: z.string().min(1, "Receiver print name is required"),
  gross_weight: z.number().min(0, "Gross weight must be 0 or greater"),
  tare_weight: z.number().min(0, "Tare weight must be 0 or greater"),
  
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
  const [selectedGenerator, setSelectedGenerator] = useState<Generator | null>(null);
  const [selectedHauler, setSelectedHauler] = useState<Hauler | null>(null);
  const [selectedReceiver, setSelectedReceiver] = useState<Receiver | null>(null);
  
  const generatorSigRef = useRef<SignaturePad>(null);
  const haulerSigRef = useRef<SignaturePad>(null);
  const receiverSigRef = useRef<SignaturePad>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mock fetch functions - replace with actual database calls
  const fetchGenerators = async (search: string): Promise<Generator[]> => {
    return [
      { id: '1', generator_name: 'Generator A', generator_city: 'Austin', generator_state: 'TX' },
      { id: '2', generator_name: 'Generator B', generator_city: 'Houston', generator_state: 'TX' },
    ].filter(g => g.generator_name.toLowerCase().includes(search.toLowerCase()));
  };

  const fetchHaulers = async (search: string): Promise<Hauler[]> => {
    return [
      { id: '1', hauler_name: 'Hauler A', hauler_city: 'Austin', hauler_state: 'TX', hauler_mi_reg: 'MI123' },
      { id: '2', hauler_name: 'Hauler B', hauler_city: 'Dallas', hauler_state: 'TX', hauler_mi_reg: 'MI456' },
    ].filter(h => h.hauler_name.toLowerCase().includes(search.toLowerCase()));
  };

  const fetchReceivers = async (search: string): Promise<Receiver[]> => {
    return [
      { id: '1', receiver_name: 'Receiver A', receiver_city: 'Austin', receiver_state: 'TX' },
      { id: '2', receiver_name: 'Receiver B', receiver_city: 'San Antonio', receiver_state: 'TX' },
    ].filter(r => r.receiver_name.toLowerCase().includes(search.toLowerCase()));
  };

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
      manifest_number: '',
      generator_id: '',
      hauler_id: '',
      receiver_id: '',
      generator_date: new Date().toISOString().split('T')[0],
      receiver_date: new Date().toISOString().split('T')[0],
      generator_print_name: '',
      hauler_print_name: '',
      receiver_print_name: '',
      gross_weight: 0,
      tare_weight: 0,
      custom_pricing: false,
      unit_price_pte: 25,
      unit_price_commercial: 35,
      unit_price_otr: 45,
      unit_price_tractor: 35,
      notes: pickup.notes || "",
    },
  });

  const customPricing = form.watch("custom_pricing");
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

  const generatePDF = async (data: CompletePickupFormData) => {
    try {
      // Get signatures as base64 strings
      const generatorSig = generatorSigRef.current?.toDataURL();
      const haulerSig = haulerSigRef.current?.toDataURL();
      const receiverSig = receiverSigRef.current?.toDataURL();

      // Prepare overlay data in the format expected by the edge function
      const overlayData = {
        // Generator data (these field names should match calibration field_name)
        generator_name: selectedGenerator?.generator_name,
        generator_mailing_address: selectedGenerator?.generator_mailing_address,
        generator_city: selectedGenerator?.generator_city,
        generator_state: selectedGenerator?.generator_state,
        generator_zip: selectedGenerator?.generator_zip,
        generator_print_name: data.generator_print_name,
        generator_date: data.generator_date,
        generator_signature: generatorSig,
        
        // Hauler data
        hauler_name: selectedHauler?.hauler_name,
        hauler_mailing_address: selectedHauler?.hauler_mailing_address,
        hauler_city: selectedHauler?.hauler_city,
        hauler_state: selectedHauler?.hauler_state,
        hauler_zip: selectedHauler?.hauler_zip,
        hauler_mi_reg: selectedHauler?.hauler_mi_reg,
        hauler_print_name: data.hauler_print_name,
        hauler_signature: haulerSig,
        
        // Receiver data
        receiver_name: selectedReceiver?.receiver_name,
        receiver_mailing_address: selectedReceiver?.receiver_mailing_address,
        receiver_city: selectedReceiver?.receiver_city,
        receiver_state: selectedReceiver?.receiver_state,
        receiver_zip: selectedReceiver?.receiver_zip,
        receiver_print_name: data.receiver_print_name,
        receiver_date: data.receiver_date,
        receiver_signature: receiverSig,
        
        // Counts and weights
        count_passenger_car: data.pte_off_rim + data.pte_on_rim,
        count_truck: data.commercial_17_5_19_5_off + data.commercial_17_5_19_5_on + data.commercial_22_5_off + data.commercial_22_5_on,
        count_oversized: data.otr_count,
        count_pte: data.tractor_count,
        gross_weight: data.gross_weight,
        tare_weight: data.tare_weight,
        net_weight: netWeight,
        manifest_number: data.manifest_number,
      };

      // Generate PDF with correct payload structure
      const { data: pdfResult, error: pdfError } = await supabase.functions.invoke('generate-manifest-pdf', {
        body: {
          template_name: 'STATE_Manifest_v1.pdf',
          version: 'v1',
          overlay_data: overlayData
        }
      });

      if (pdfError) throw pdfError;

      toast({
        title: "Success!",
        description: "Manifest PDF generated successfully.",
      });

      return pdfResult;
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const onSubmit = async (data: CompletePickupFormData) => {
    setIsSubmitting(true);
    try {
      // Validate required fields
      if (!selectedGenerator || !selectedHauler || !selectedReceiver) {
        toast({
          title: "Missing Information",
          description: "Please select a generator, hauler, and receiver.",
          variant: "destructive",
        });
        return;
      }

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

      // Generate manifest PDF
      await generatePDF(data);

      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      
      toast({
        title: "Pickup Completed",
        description: "Pickup completed and manifest generated successfully!",
      });
    } catch (error) {
      console.error('Failed to save pickup data:', error);
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
            
            {/* Manifest Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Manifest Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="manifest_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manifest Number *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter manifest number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="generator_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Generator Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="receiver_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receiver Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  
                  <FormField
                    control={form.control}
                    name="receiver_print_name"
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

                  <div>
                    <label className="text-sm font-medium">Receiver Signature</label>
                    <div className="border rounded-lg mt-2">
                      <SignaturePad
                        ref={receiverSigRef}
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
                      onClick={() => receiverSigRef.current?.clear()}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tire Counts */}
            <div className="space-y-6">
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
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-brand-success hover:bg-brand-success/90">
                {isSubmitting ? "Saving..." : "Continue to Manifest"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
