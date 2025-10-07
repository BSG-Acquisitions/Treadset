import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import SignatureCanvas from "react-signature-canvas";
import { useHaulerCustomers, useCreateHaulerCustomer, type CreateHaulerCustomerData } from "@/hooks/useHaulerCustomers";
import { useHaulerManifests } from "@/hooks/useHaulerManifests";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, ChevronLeft, ChevronRight, Building, Package, PenTool, DollarSign, Plus, X } from "lucide-react";
import { pteToTons, MICHIGAN_CONVERSIONS } from "@/lib/michigan-conversions";

// Validation schema matching driver wizard
const manifestSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  pte_off_rim: z.coerce.number().min(0).default(0),
  pte_on_rim: z.coerce.number().min(0).default(0),
  commercial_17_5_19_5_off: z.coerce.number().min(0).default(0),
  commercial_17_5_19_5_on: z.coerce.number().min(0).default(0),
  commercial_22_5_off: z.coerce.number().min(0).default(0),
  commercial_22_5_on: z.coerce.number().min(0).default(0),
  otr_count: z.coerce.number().min(0).default(0),
  tractor_count: z.coerce.number().min(0).default(0),
  gross_weight_lbs: z.coerce.number().min(0).optional().default(0),
  tare_weight_lbs: z.coerce.number().min(0).optional().default(0),
  weight_tons_manual: z.coerce.number().min(0).optional().default(0),
  payment_method: z.enum(["CASH", "CHECK", "CARD"]),
  payment_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  generator_print_name: z.string().min(1, "Generator name is required"),
  hauler_print_name: z.string().min(1, "Hauler name is required"),
});

type ManifestFormData = z.infer<typeof manifestSchema>;

const steps = [
  { key: "customer", title: "Customer Info", icon: Building },
  { key: "tires", title: "Tire Counts", icon: Package },
  { key: "signatures", title: "Signatures", icon: PenTool },
  { key: "review", title: "Review & Submit", icon: CheckCircle },
  { key: "payment", title: "Payment Details", icon: DollarSign },
];

const PRESET_RATES = {
  passengerOffRim: ['2.50', '2.75', '3.00', '3.25', '3.50'],
  passengerOnRim: ['3.00', '3.25', '3.50', '3.75', '4.00'],
  commercialOffRim: ['10.00', '11.00', '12.00', '13.00', '14.00', '15.00', '16.00', '17.00', '18.00', '19.00', '20.00'],
  commercialOnRim: ['12.00', '13.00', '14.00', '15.00', '16.00', '17.00', '18.00', '19.00', '20.00', '21.00', '22.00'],
  otr: ['50.00', '70.00', '90.00', '110.00', '130.00', '150.00']
};

interface HaulerManifestWizardProps {
  haulerId: string;
  haulerName: string;
}

export const HaulerManifestWizard = ({ haulerId, haulerName }: HaulerManifestWizardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manifestCreated, setManifestCreated] = useState(false);
  const [manualWeightOverride, setManualWeightOverride] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState<CreateHaulerCustomerData>({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "MI",
    zip: "",
    county: "",
  });
  
  // Rate states for payment step
  const [pteOffRimRate, setPteOffRimRate] = useState<string>("");
  const [pteOnRimRate, setPteOnRimRate] = useState<string>("");
  const [commercialOffRimRate, setCommercialOffRimRate] = useState<string>("");
  const [commercialOnRimRate, setCommercialOnRimRate] = useState<string>("");
  const [otrRate, setOtrRate] = useState<string>("");
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  
  const { data: customers } = useHaulerCustomers(haulerId);
  const { createManifest } = useHaulerManifests(haulerId);
  const createCustomer = useCreateHaulerCustomer();

  // Signature refs
  const generatorSigRef = useRef<SignatureCanvas>(null);
  const haulerSigRef = useRef<SignatureCanvas>(null);

  const form = useForm<ManifestFormData>({
    resolver: zodResolver(manifestSchema),
    mode: "onChange",
    defaultValues: {
      customer_id: "",
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
      payment_method: "CASH",
      payment_amount: 0,
      notes: "",
      generator_print_name: "",
      hauler_print_name: "",
    },
  });

  const selectedCustomer = customers?.find(c => c.id === form.watch('customer_id'));
  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  // Helpers for PTE and weight calculations (Michigan rule: 89 PTE = 1 ton)
  const computeTotalPTE = (vals: ManifestFormData) => {
    const passenger = ((vals.pte_off_rim || 0) + (vals.pte_on_rim || 0)) * MICHIGAN_CONVERSIONS.PASSENGER_TIRE_TO_PTE;
    const truckCount = (vals.commercial_17_5_19_5_off || 0) + (vals.commercial_17_5_19_5_on || 0) + (vals.commercial_22_5_off || 0) + (vals.commercial_22_5_on || 0);
    const truck = truckCount * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;
    const tractor = (vals.tractor_count || 0) * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;
    const otr = (vals.otr_count || 0) * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE;
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
      const tons = totalPTE / 89;
      const pounds = tons * 2000;
      const calculatedGross = Math.round(pounds * 10) / 10;
      
      form.setValue('gross_weight_lbs', calculatedGross, { shouldValidate: false });
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
  ]);

  // Calculate payment total when rates change
  useEffect(() => {
    if (steps[step]?.key === "payment") {
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
  }, [pteOffRimRate, pteOnRimRate, commercialOffRimRate, commercialOnRimRate, otrRate, step]);

  const handleNext = async () => {
    if (currentStep.key === "customer") {
      if (!form.getValues().customer_id) {
        toast({ title: "Missing Information", description: "Please select a customer", variant: "destructive" });
        return;
      }
    }

    if (currentStep.key === "tires") {
      const values = form.getValues();
      const totalTires = values.pte_off_rim + values.pte_on_rim + 
                        values.commercial_17_5_19_5_off + values.commercial_17_5_19_5_on +
                        values.commercial_22_5_off + values.commercial_22_5_on +
                        values.otr_count + values.tractor_count;
      
      if (totalTires === 0) {
        toast({ title: "Missing Information", description: "Please enter at least one tire count", variant: "destructive" });
        return;
      }
    }

    if (currentStep.key === "signatures") {
      const hasGeneratorSig = generatorSigRef.current && !generatorSigRef.current.isEmpty();
      const hasHaulerSig = haulerSigRef.current && !haulerSigRef.current.isEmpty();
      
      if (!hasGeneratorSig || !hasHaulerSig) {
        toast({ title: "Missing Signatures", description: "Both generator and hauler signatures are required", variant: "destructive" });
        return;
      }

      const valid = await form.trigger(['generator_print_name', 'hauler_print_name']);
      if (!valid) return;
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!generatorSigRef.current || generatorSigRef.current.isEmpty()) return;
    if (!haulerSigRef.current || haulerSigRef.current.isEmpty()) return;

    setIsSubmitting(true);

    try {
      const data = form.getValues();
      await createManifest.mutateAsync({
        hauler_customer_id: data.customer_id,
        pte_off_rim: data.pte_off_rim,
        pte_on_rim: data.pte_on_rim,
        commercial_17_5_19_5_off: data.commercial_17_5_19_5_off,
        commercial_17_5_19_5_on: data.commercial_17_5_19_5_on,
        commercial_22_5_off: data.commercial_22_5_off,
        commercial_22_5_on: data.commercial_22_5_on,
        otr_count: data.otr_count,
        tractor_count: data.tractor_count,
        gross_weight_lbs: data.gross_weight_lbs,
        tare_weight_lbs: data.tare_weight_lbs,
        payment_method: data.payment_method,
        payment_amount: calculatedTotal || data.payment_amount,
        notes: data.notes,
        generator_signature: generatorSigRef.current.toDataURL(),
        generator_print_name: data.generator_print_name,
        hauler_signature: haulerSigRef.current.toDataURL(),
        hauler_print_name: data.hauler_print_name
      });

      setManifestCreated(true);
    } catch (error) {
      console.error('Failed to create manifest:', error);
      toast({ title: "Error", description: "Failed to create manifest", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (manifestCreated) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Manifest Created Successfully!</h2>
              <p className="text-muted-foreground">
                Your manifest has been created and sent to the facility for receiver signature.
                You'll receive the completed manifest once it's been processed.
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={() => navigate('/hauler-manifests')}>
                  View My Manifests
                </Button>
                <Button variant="outline" onClick={() => {
                  setManifestCreated(false);
                  setStep(0);
                  form.reset();
                  generatorSigRef.current?.clear();
                  haulerSigRef.current?.clear();
                }}>
                  Create Another
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep.key) {
      case "customer":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Customer Information</h3>
              </div>
              {!showAddCustomer && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCustomer(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add New Customer
                </Button>
              )}
            </div>

            {showAddCustomer ? (
              <Card className="border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">New Customer Details</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddCustomer(false);
                        setNewCustomerData({
                          company_name: "",
                          contact_name: "",
                          email: "",
                          phone: "",
                          address: "",
                          city: "",
                          state: "MI",
                          zip: "",
                          county: "",
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Company Name *</Label>
                      <Input
                        value={newCustomerData.company_name}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, company_name: e.target.value })}
                        placeholder="ABC Tire Shop"
                        required
                      />
                    </div>
                    <div>
                      <Label>Contact Name</Label>
                      <Input
                        value={newCustomerData.contact_name}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, contact_name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newCustomerData.email}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                        placeholder="contact@company.com"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Address</Label>
                      <Input
                        value={newCustomerData.address}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                        placeholder="123 Main St"
                      />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        value={newCustomerData.city}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                        placeholder="Detroit"
                      />
                    </div>
                    <div>
                      <Label>County</Label>
                      <Input
                        value={newCustomerData.county}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, county: e.target.value })}
                        placeholder="Wayne"
                      />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input
                        value={newCustomerData.state}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, state: e.target.value })}
                        placeholder="MI"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label>ZIP</Label>
                      <Input
                        value={newCustomerData.zip}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, zip: e.target.value })}
                        placeholder="48201"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!newCustomerData.company_name.trim()) {
                        toast({ title: "Error", description: "Company name is required", variant: "destructive" });
                        return;
                      }
                      try {
                        const result = await createCustomer.mutateAsync({
                          haulerId,
                          data: newCustomerData,
                        }) as any;
                        form.setValue("customer_id", result?.id || "");
                        setShowAddCustomer(false);
                        setNewCustomerData({
                          company_name: "",
                          contact_name: "",
                          email: "",
                          phone: "",
                          address: "",
                          city: "",
                          state: "MI",
                          zip: "",
                          county: "",
                        });
                      } catch (error) {
                        console.error("Failed to create customer:", error);
                      }
                    }}
                    className="w-full"
                    disabled={createCustomer.isPending}
                  >
                    {createCustomer.isPending ? "Saving..." : "Save Customer"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a customer..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.company_name || customer.contact_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCustomer && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Customer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div><strong>Contact:</strong> {selectedCustomer.contact_name}</div>
                      <div><strong>Phone:</strong> {selectedCustomer.phone || 'N/A'}</div>
                      <div><strong>Email:</strong> {selectedCustomer.email || 'N/A'}</div>
                      {selectedCustomer.address && <div><strong>Address:</strong> {selectedCustomer.address}</div>}
                    </CardContent>
                  </Card>
                )}
              </>
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
                        ? "Manual entry enabled" 
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
                            disabled={!manualWeightOverride}
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
                            placeholder="Enter tare weight"
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
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
              <PenTool className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Digital Signatures</h3>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generator Signature</CardTitle>
                <CardDescription>Customer representative signature</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField
                  control={form.control}
                  name="generator_print_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Printed Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Signature *</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => generatorSigRef.current?.clear()}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="border-2 border-border rounded-lg bg-white overflow-hidden">
                    <SignatureCanvas
                      ref={generatorSigRef}
                      canvasProps={{ 
                        className: "w-full h-32 touch-none",
                        style: { width: '100%', height: '128px' }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hauler Signature</CardTitle>
                <CardDescription>Your signature</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField
                  control={form.control}
                  name="hauler_print_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Printed Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Signature *</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => haulerSigRef.current?.clear()}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="border-2 border-border rounded-lg bg-white overflow-hidden">
                    <SignatureCanvas
                      ref={haulerSigRef}
                      canvasProps={{ 
                        className: "w-full h-32 touch-none",
                        style: { width: '100%', height: '128px' }
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

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Review & Submit</h3>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tire Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>PTE (Off/On Rim):</span> <strong>{totalPTE}</strong></div>
                <div className="flex justify-between"><span>Commercial:</span> <strong>{totalCommercial}</strong></div>
                <div className="flex justify-between"><span>Oversized:</span> <strong>{totalOversized}</strong></div>
                <div className="border-t pt-2 flex justify-between"><span><strong>Total PTE:</strong></span> <strong>{totalPteCalculated}</strong></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Gross (lbs):</span> <strong>{gross.toFixed(1)}</strong></div>
                <div className="flex justify-between"><span>Tare (lbs):</span> <strong>{tare.toFixed(1)}</strong></div>
                <div className="flex justify-between"><span>Net (lbs):</span> <strong>{net.toFixed(1)}</strong></div>
                <div className="flex justify-between"><span>Tons:</span> <strong>{calcTonsFromPTE().toFixed(2)}</strong></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Signatures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Generator:</strong> {values.generator_print_name}</div>
                <div><strong>Hauler:</strong> {values.hauler_print_name}</div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
              <p className="font-semibold mb-2">What happens next:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Manifest will be sent to facility for receiver signature</li>
                <li>Final manifest with all signatures will be generated</li>
                <li>You'll receive the completed manifest via email</li>
              </ol>
            </div>
          </div>
        );

      case "payment":
        const formValues = form.getValues();
        const pteOffRimCount = formValues.pte_off_rim || 0;
        const pteOnRimCount = formValues.pte_on_rim || 0;
        const commercialOffRimCount = (formValues.commercial_17_5_19_5_off || 0) + (formValues.commercial_22_5_off || 0);
        const commercialOnRimCount = (formValues.commercial_17_5_19_5_on || 0) + (formValues.commercial_22_5_on || 0);
        const otrTotalCount = (formValues.otr_count || 0) + (formValues.tractor_count || 0);

        return (
          <div className="space-y-4">
            <div className="text-center py-4">
              <DollarSign className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Set Rates for Payment</h3>
              <p className="text-muted-foreground">
                Enter rates for each tire category to calculate total
              </p>
            </div>

            {pteOffRimCount > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Passenger Off-Rim Rate ({pteOffRimCount} tires)
                </label>
                <Select value={pteOffRimRate} onValueChange={setPteOffRimRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_RATES.passengerOffRim.map((rate) => (
                      <SelectItem key={rate} value={rate}>
                        ${rate} per tire
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Or enter custom rate"
                  value={pteOffRimRate}
                  onChange={(e) => setPteOffRimRate(e.target.value)}
                />
              </div>
            )}

            {pteOnRimCount > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Passenger On-Rim Rate ({pteOnRimCount} tires)
                </label>
                <Select value={pteOnRimRate} onValueChange={setPteOnRimRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_RATES.passengerOnRim.map((rate) => (
                      <SelectItem key={rate} value={rate}>
                        ${rate} per tire
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Or enter custom rate"
                  value={pteOnRimRate}
                  onChange={(e) => setPteOnRimRate(e.target.value)}
                />
              </div>
            )}

            {commercialOffRimCount > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Commercial Off-Rim Rate ({commercialOffRimCount} tires)
                </label>
                <Select value={commercialOffRimRate} onValueChange={setCommercialOffRimRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_RATES.commercialOffRim.map((rate) => (
                      <SelectItem key={rate} value={rate}>
                        ${rate} per tire
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Or enter custom rate"
                  value={commercialOffRimRate}
                  onChange={(e) => setCommercialOffRimRate(e.target.value)}
                />
              </div>
            )}

            {commercialOnRimCount > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Commercial On-Rim Rate ({commercialOnRimCount} tires)
                </label>
                <Select value={commercialOnRimRate} onValueChange={setCommercialOnRimRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_RATES.commercialOnRim.map((rate) => (
                      <SelectItem key={rate} value={rate}>
                        ${rate} per tire
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Or enter custom rate"
                  value={commercialOnRimRate}
                  onChange={(e) => setCommercialOnRimRate(e.target.value)}
                />
              </div>
            )}

            {otrTotalCount > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  OTR/Tractor Rate ({otrTotalCount} tires)
                </label>
                <Select value={otrRate} onValueChange={setOtrRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_RATES.otr.map((rate) => (
                      <SelectItem key={rate} value={rate}>
                        ${rate} per tire
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Or enter custom rate"
                  value={otrRate}
                  onChange={(e) => setOtrRate(e.target.value)}
                />
              </div>
            )}

            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Calculated Total</p>
                  <p className="text-3xl font-bold text-primary">${calculatedTotal.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHECK">Check</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional details..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>Step {step + 1} of {steps.length}</span>
          <span>{currentStep.title}</span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Card>
            <CardContent className="pt-6">
              {renderStepContent()}

              <div className="flex justify-between mt-6 pt-6 border-t">
                {step > 0 && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                )}
                
                {step < steps.length - 1 ? (
                  <Button type="button" onClick={handleNext} className="ml-auto">
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="ml-auto">
                    {isSubmitting ? "Creating..." : "Create Manifest"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};
