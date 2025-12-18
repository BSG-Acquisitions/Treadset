import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useClients } from "@/hooks/useClients";
import { useCreateDropoffWithManifest } from "@/hooks/useCreateDropoffWithManifest";
import { useHaulers } from "@/hooks/useHaulers";
import { useReceivers } from "@/hooks/useReceivers";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, DollarSign, Factory, Truck, Building2, Plus, ChevronLeft, ChevronRight, Pen, CheckCircle2, Eraser, Loader2, AlertTriangle } from "lucide-react";
import { CreateHaulerDialog } from "./CreateHaulerDialog";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import { calculateTotalPTE } from "@/lib/michigan-conversions";
import { format } from "date-fns";
import { SearchableDropdown } from "@/components/SearchableDropdown";
import { supabase } from "@/integrations/supabase/client";
import SignatureCanvas from "react-signature-canvas";
import { cn } from "@/lib/utils";

interface ProcessDropoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCustomerId?: string | null;
}

type WizardStep = 'info' | 'generator-sig' | 'hauler-sig' | 'receiver-sig' | 'confirmation';

const STEPS: WizardStep[] = ['info', 'generator-sig', 'hauler-sig', 'receiver-sig', 'confirmation'];

export const ProcessDropoffDialog = ({ open, onOpenChange, selectedCustomerId }: ProcessDropoffDialogProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('info');
  
  // Form state
  const [customerId, setCustomerId] = useState(selectedCustomerId || "");
  const [haulerId, setHaulerId] = useState("");
  const [showCreateHauler, setShowCreateHauler] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [pteCount, setPteCount] = useState("");
  const [otrCount, setOtrCount] = useState("");
  const [tractorCount, setTractorCount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [manualRevenue, setManualRevenue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGenerator, setSelectedGenerator] = useState<any>(null);
  const [selectedHauler, setSelectedHauler] = useState<any>(null);
  const [selectedReceiverId, setSelectedReceiverId] = useState("");
  
  // Optional signature toggles
  const [hasGeneratorSig, setHasGeneratorSig] = useState(true);
  const [hasHaulerSig, setHasHaulerSig] = useState(false);
  const [hasReceiverSig, setHasReceiverSig] = useState(true);
  
  // Generator signature state
  const [generatorPrintName, setGeneratorPrintName] = useState("");
  const [generatorSigDataUrl, setGeneratorSigDataUrl] = useState<string | null>(null);
  
  // Hauler signature state
  const [haulerPrintName, setHaulerPrintName] = useState("");
  const [haulerSigDataUrl, setHaulerSigDataUrl] = useState<string | null>(null);
  
  // Receiver signature state
  const [receiverPrintName, setReceiverPrintName] = useState("");
  const [receiverSigDataUrl, setReceiverSigDataUrl] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  
  const generatorSigRef = useRef<SignatureCanvas | null>(null);
  const haulerSigRef = useRef<SignatureCanvas | null>(null);
  const receiverSigRef = useRef<SignatureCanvas | null>(null);

  const { data: clientsData } = useClients();
  const customers = Array.isArray(clientsData) ? clientsData : (clientsData?.data || []);
  const { data: haulers = [] } = useHaulers();
  const { data: receivers } = useReceivers();
  const { data: employees } = useEmployees();
  const createDropoffWithManifest = useCreateDropoffWithManifest();

  const selectedCustomer = selectedGenerator || customers.find(c => c.id === customerId);
  const selectedReceiverData = receivers?.find(r => r.id === selectedReceiverId);

  const printNameOptions = employees
    ?.filter(emp => emp.isActive)
    ?.map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      signatureDataUrl: emp.signatureDataUrl
    }))
    ?.filter(opt => opt.name.length > 0) || [];

  // Search functions
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

  const searchHaulers = async (search: string) => {
    const { data, error } = await supabase
      .from('haulers')
      .select('*')
      .ilike('hauler_name', `%${search}%`)
      .eq('is_active', true)
      .order('hauler_name')
      .limit(50);
    if (error) return [];
    return data || [];
  };

  const computedPTE = calculateTotalPTE({
    pte_count: Number(pteCount || 0),
    otr_count: Number(otrCount || 0),
    tractor_count: Number(tractorCount || 0),
  });

  useEffect(() => {
    if (selectedCustomerId) {
      setCustomerId(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const employee = employees?.find(emp => emp.id === employeeId);
    if (employee) {
      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      setReceiverPrintName(fullName);
      if (employee.signatureDataUrl && receiverSigRef.current) {
        receiverSigRef.current.fromDataURL(employee.signatureDataUrl);
        setReceiverSigDataUrl(employee.signatureDataUrl);
      }
    }
  };

  const resetForm = () => {
    setCurrentStep('info');
    setCustomerId("");
    setHaulerId("");
    setPteCount("");
    setOtrCount("");
    setTractorCount("");
    setPaymentMethod("cash");
    setNotes("");
    setManualRevenue("");
    setSelectedGenerator(null);
    setSelectedHauler(null);
    setSelectedReceiverId("");
    setHasGeneratorSig(true);
    setHasHaulerSig(false);
    setHasReceiverSig(true);
    setGeneratorPrintName("");
    setGeneratorSigDataUrl(null);
    setHaulerPrintName("");
    setHaulerSigDataUrl(null);
    setReceiverPrintName("");
    setReceiverSigDataUrl(null);
    setSelectedEmployeeId("");
    generatorSigRef.current?.clear();
    haulerSigRef.current?.clear();
    receiverSigRef.current?.clear();
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const dataURLtoBlob = (dataURL: string) => {
    const parts = dataURL.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const byteString = atob(parts[1] ?? '');
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], { type: mime });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      if (!customerId) throw new Error("Please select a customer");

      const orgId = user?.currentOrganization?.id || "";
      const timestamp = new Date().toISOString();
      const now = new Date();
      const localDate = format(now, 'yyyy-MM-dd');
      const localTime = format(now, 'HH:mm:ss');

      let generatorUploadPath: string | null = null;
      let haulerUploadPath: string | null = null;
      let receiverUploadPath: string | null = null;

      // Upload generator signature if captured
      if (hasGeneratorSig && generatorSigDataUrl && generatorPrintName) {
        const blob = dataURLtoBlob(generatorSigDataUrl);
        const fileName = `generator_signature_${Date.now()}.png`;
        generatorUploadPath = `${orgId}/signatures/${fileName}`;
        const { error } = await supabase.storage
          .from('manifests')
          .upload(generatorUploadPath, blob, { contentType: 'image/png', upsert: false });
        if (error) throw new Error(`Generator signature upload failed: ${error.message}`);
      }

      // Upload hauler signature if captured
      if (hasHaulerSig && haulerSigDataUrl && haulerPrintName) {
        const blob = dataURLtoBlob(haulerSigDataUrl);
        const fileName = `hauler_signature_${Date.now()}.png`;
        haulerUploadPath = `${orgId}/signatures/${fileName}`;
        const { error } = await supabase.storage
          .from('manifests')
          .upload(haulerUploadPath, blob, { contentType: 'image/png', upsert: false });
        if (error) throw new Error(`Hauler signature upload failed: ${error.message}`);
      }

      // Upload receiver signature if captured
      if (hasReceiverSig && receiverSigDataUrl && receiverPrintName) {
        const blob = dataURLtoBlob(receiverSigDataUrl);
        const fileName = `receiver_signature_${Date.now()}.png`;
        receiverUploadPath = `${orgId}/signatures/${fileName}`;
        const { error } = await supabase.storage
          .from('manifests')
          .upload(receiverUploadPath, blob, { contentType: 'image/png', upsert: false });
        if (error) throw new Error(`Receiver signature upload failed: ${error.message}`);
      }

      await createDropoffWithManifest.mutateAsync({
        dropoff: {
          organization_id: orgId,
          client_id: customerId,
          hauler_id: haulerId || null,
          dropoff_date: localDate,
          dropoff_time: localTime,
          pte_count: Number(pteCount || 0),
          otr_count: Number(otrCount || 0),
          tractor_count: Number(tractorCount || 0),
          unit_price_pte: null,
          unit_price_otr: null,
          unit_price_tractor: null,
          computed_revenue: Number(manualRevenue) || 0,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'invoice' ? 'pending' : 'paid',
          requires_manifest: true,
          notes: notes || null,
          status: 'completed',
          processed_by: user?.id || null,
          // Generator signature
          generator_sig_path: generatorUploadPath,
          generator_signed_by: hasGeneratorSig ? generatorPrintName : null,
          generator_signed_at: hasGeneratorSig && generatorSigDataUrl ? timestamp : null,
          // Hauler signature
          hauler_sig_path: haulerUploadPath,
          hauler_signed_by: hasHaulerSig ? haulerPrintName : null,
          hauler_signed_at: hasHaulerSig && haulerSigDataUrl ? timestamp : null,
          // Receiver signature
          receiver_sig_path: receiverUploadPath,
          receiver_signed_by: hasReceiverSig ? receiverPrintName : null,
          receiver_signed_at: hasReceiverSig && receiverSigDataUrl ? timestamp : null,
        },
        vehicleId: undefined,
        receiverId: selectedReceiverId || undefined,
      });

      handleClose();
    } catch (error: any) {
      console.error('Error processing dropoff:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if all required signatures are captured
  const missingSignatures = [];
  if (hasGeneratorSig && (!generatorSigDataUrl || !generatorPrintName)) missingSignatures.push('Generator');
  if (hasHaulerSig && (!haulerSigDataUrl || !haulerPrintName)) missingSignatures.push('Hauler');
  if (hasReceiverSig && (!receiverSigDataUrl || !receiverPrintName)) missingSignatures.push('Receiver');
  
  const anySignaturesCaptured = 
    (hasGeneratorSig && generatorSigDataUrl && generatorPrintName) ||
    (hasHaulerSig && haulerSigDataUrl && haulerPrintName) ||
    (hasReceiverSig && receiverSigDataUrl && receiverPrintName);

  const canProceedFromInfo = customerId && (pteCount || otrCount || tractorCount) && manualRevenue && Number(manualRevenue) > 0;
  const canProceedFromGeneratorSig = !hasGeneratorSig || (generatorSigDataUrl && generatorPrintName);
  const canProceedFromHaulerSig = !hasHaulerSig || (haulerSigDataUrl && haulerPrintName);
  const canProceedFromReceiverSig = !hasReceiverSig || (receiverSigDataUrl && receiverPrintName);

  const goNext = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      // Capture signature data before moving
      if (currentStep === 'generator-sig' && generatorSigRef.current && !generatorSigRef.current.isEmpty()) {
        setGeneratorSigDataUrl(generatorSigRef.current.toDataURL());
      }
      if (currentStep === 'hauler-sig' && haulerSigRef.current && !haulerSigRef.current.isEmpty()) {
        setHaulerSigDataUrl(haulerSigRef.current.toDataURL());
      }
      if (currentStep === 'receiver-sig' && receiverSigRef.current && !receiverSigRef.current.isEmpty()) {
        setReceiverSigDataUrl(receiverSigRef.current.toDataURL());
      }
      setCurrentStep(STEPS[idx + 1]);
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1]);
    }
  };

  const stepIndex = STEPS.indexOf(currentStep);

  const getStepLabel = (step: WizardStep) => {
    switch (step) {
      case 'info': return 'Information';
      case 'generator-sig': return 'Generator Sig';
      case 'hauler-sig': return 'Hauler Sig';
      case 'receiver-sig': return 'Receiver Sig';
      case 'confirmation': return 'Review';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl sm:max-w-2xl w-full max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Process Tire Drop-off
          </DialogTitle>
          <DialogDescription>
            Step {stepIndex + 1} of {STEPS.length}: {
              currentStep === 'info' ? 'Drop-off Information' :
              currentStep === 'generator-sig' ? 'Generator Signature (Optional)' :
              currentStep === 'hauler-sig' ? 'Hauler Signature (Optional)' :
              currentStep === 'receiver-sig' ? 'Receiver Signature (Optional)' :
              'Review & Submit'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                idx <= stepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {idx < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 h-1 mx-0.5",
                  idx < stepIndex ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-250px)] pr-2">
          {/* Step 1: Drop-off Information */}
          {currentStep === 'info' && (
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">Manifest Parties</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Factory className="h-4 w-4" />
                        Generator (Tire Source)
                      </Label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateClient(true)} className="h-8">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Client
                      </Button>
                    </div>
                    <SearchableDropdown
                      placeholder="Select generator..."
                      searchFunction={searchClients}
                      onSelect={(client) => {
                        setSelectedGenerator(client);
                        setCustomerId(client?.id || "");
                      }}
                      displayField="company_name"
                      selected={selectedGenerator}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Hauler (Transporter)
                      </Label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateHauler(true)} className="h-8">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Hauler
                      </Button>
                    </div>
                    <SearchableDropdown
                      placeholder="Select hauler (optional)..."
                      searchFunction={searchHaulers}
                      onSelect={(hauler) => {
                        setSelectedHauler(hauler);
                        setHaulerId(hauler?.id || "");
                      }}
                      displayField="hauler_name"
                      selected={selectedHauler}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Receiver
                    </Label>
                    <Select value={selectedReceiverId} onValueChange={setSelectedReceiverId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select receiver..." />
                      </SelectTrigger>
                      <SelectContent>
                        {receivers?.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.receiver_name} - {r.receiver_city}, {r.receiver_state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Label className="text-base font-medium">Tire Counts by Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pte">Passenger Tires</Label>
                    <Input id="pte" type="number" value={pteCount} onChange={(e) => setPteCount(e.target.value)} placeholder="0" />
                    <div className="text-xs text-muted-foreground">1 tire = 1 PTE</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otr">OTR Tires</Label>
                    <Input id="otr" type="number" value={otrCount} onChange={(e) => setOtrCount(e.target.value)} placeholder="0" />
                    <div className="text-xs text-muted-foreground">1 tire = 15 PTE</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tractor">Semi Tires</Label>
                    <Input id="tractor" type="number" value={tractorCount} onChange={(e) => setTractorCount(e.target.value)} placeholder="0" />
                    <div className="text-xs text-muted-foreground">1 tire = 5 PTE</div>
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="font-medium">Amount Charged</span>
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input type="number" step="0.01" min="0" value={manualRevenue} onChange={(e) => setManualRevenue(e.target.value)} className="pl-7 text-lg font-medium" placeholder="0.00" />
                    </div>
                    {computedPTE > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t border-border">
                        <span>Total PTE (for tracking)</span>
                        <span>{computedPTE}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="card">Credit Card</SelectItem>
                    <SelectItem value="invoice">Invoice Later</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Notes (Optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={2} />
              </div>
            </div>
          )}

          {/* Step 2: Generator Signature */}
          {currentStep === 'generator-sig' && (
            <Card className="border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Factory className="h-5 w-5 text-primary" />
                    <span className="font-medium text-lg">Generator Signature</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="has-generator-sig" className="text-sm">Capture now?</Label>
                    <Switch
                      id="has-generator-sig"
                      checked={hasGeneratorSig}
                      onCheckedChange={setHasGeneratorSig}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  The generator is the source of the tires (e.g., tire shop, auto dealer)
                </p>
                
                {hasGeneratorSig ? (
                  <>
                    <div className="space-y-2">
                      <Label>Print Name *</Label>
                      <Input
                        placeholder="Enter generator name"
                        value={generatorPrintName}
                        onChange={(e) => setGeneratorPrintName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Signature *</Label>
                        <Button variant="ghost" size="sm" onClick={() => { generatorSigRef.current?.clear(); setGeneratorSigDataUrl(null); }}>
                          <Eraser className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      </div>
                      <div className="border-2 border-dashed border-border rounded-lg bg-background p-1">
                        <SignatureCanvas
                          ref={(ref) => { generatorSigRef.current = ref; }}
                          canvasProps={{
                            className: "w-full h-40 rounded",
                            style: { width: '100%', height: '160px' }
                          }}
                          backgroundColor="white"
                          onEnd={() => {
                            if (generatorSigRef.current && !generatorSigRef.current.isEmpty()) {
                              setGeneratorSigDataUrl(generatorSigRef.current.toDataURL());
                            }
                          }}
                        />
                      </div>
                    </div>

                    {generatorSigDataUrl && generatorPrintName && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Signature captured for {generatorPrintName}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-muted/50 p-4 rounded-lg border border-dashed">
                    <p className="text-sm text-muted-foreground">
                      Generator signature will be skipped. You can add it later from the drop-offs list.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Hauler Signature */}
          {currentStep === 'hauler-sig' && (
            <Card className="border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <span className="font-medium text-lg">Hauler Signature</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="has-hauler-sig" className="text-sm">Capture now?</Label>
                    <Switch
                      id="has-hauler-sig"
                      checked={hasHaulerSig}
                      onCheckedChange={setHasHaulerSig}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  The hauler is the person/company transporting the tires
                </p>
                
                {hasHaulerSig ? (
                  <>
                    <div className="space-y-2">
                      <Label>Print Name *</Label>
                      <Input
                        placeholder="Enter hauler name"
                        value={haulerPrintName}
                        onChange={(e) => setHaulerPrintName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Signature *</Label>
                        <Button variant="ghost" size="sm" onClick={() => { haulerSigRef.current?.clear(); setHaulerSigDataUrl(null); }}>
                          <Eraser className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      </div>
                      <div className="border-2 border-dashed border-border rounded-lg bg-background p-1">
                        <SignatureCanvas
                          ref={(ref) => { haulerSigRef.current = ref; }}
                          canvasProps={{
                            className: "w-full h-40 rounded",
                            style: { width: '100%', height: '160px' }
                          }}
                          backgroundColor="white"
                          onEnd={() => {
                            if (haulerSigRef.current && !haulerSigRef.current.isEmpty()) {
                              setHaulerSigDataUrl(haulerSigRef.current.toDataURL());
                            }
                          }}
                        />
                      </div>
                    </div>

                    {haulerSigDataUrl && haulerPrintName && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Signature captured for {haulerPrintName}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-muted/50 p-4 rounded-lg border border-dashed">
                    <p className="text-sm text-muted-foreground">
                      Hauler signature will be skipped. You can add it later from the drop-offs list.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Receiver Signature */}
          {currentStep === 'receiver-sig' && (
            <Card className="border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-medium text-lg">Receiver Signature (BSG Staff)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="has-receiver-sig" className="text-sm">Capture now?</Label>
                    <Switch
                      id="has-receiver-sig"
                      checked={hasReceiverSig}
                      onCheckedChange={setHasReceiverSig}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">BSG staff member receiving the tires</p>

                {hasReceiverSig ? (
                  <>
                    {printNameOptions.length > 0 && (
                      <div className="space-y-2">
                        <Label>Select Employee (Optional)</Label>
                        <Select value={selectedEmployeeId} onValueChange={handleEmployeeSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose employee with saved signature..." />
                          </SelectTrigger>
                          <SelectContent>
                            {printNameOptions.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.name} {opt.signatureDataUrl && '(saved)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label>Print Name *</Label>
                      <Input
                        placeholder="Enter receiver staff name"
                        value={receiverPrintName}
                        onChange={(e) => { setReceiverPrintName(e.target.value); setSelectedEmployeeId(""); }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Signature *</Label>
                        <Button variant="ghost" size="sm" onClick={() => { receiverSigRef.current?.clear(); setReceiverSigDataUrl(null); }}>
                          <Eraser className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      </div>
                      <div className="border-2 border-dashed border-border rounded-lg bg-background p-1">
                        <SignatureCanvas
                          ref={(ref) => { receiverSigRef.current = ref; }}
                          canvasProps={{
                            className: "w-full h-40 rounded",
                            style: { width: '100%', height: '160px' }
                          }}
                          backgroundColor="white"
                          onEnd={() => {
                            if (receiverSigRef.current && !receiverSigRef.current.isEmpty()) {
                              setReceiverSigDataUrl(receiverSigRef.current.toDataURL());
                            }
                          }}
                        />
                      </div>
                    </div>

                    {receiverSigDataUrl && receiverPrintName && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Signature captured for {receiverPrintName}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-muted/50 p-4 rounded-lg border border-dashed">
                    <p className="text-sm text-muted-foreground">
                      Receiver signature will be skipped. You can add it later from the Receiver Signatures page.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Confirmation */}
          {currentStep === 'confirmation' && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Review Drop-off Details
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Generator:</span>
                      <p className="font-medium">{selectedCustomer?.company_name || 'Not selected'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hauler:</span>
                      <p className="font-medium">{selectedHauler?.hauler_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Receiver:</span>
                      <p className="font-medium">{selectedReceiverData?.receiver_name || 'Not selected'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-medium text-lg">${Number(manualRevenue || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <span className="text-muted-foreground text-sm">Tire Counts:</span>
                    <div className="flex gap-4 mt-1">
                      {Number(pteCount) > 0 && <span className="font-medium">{pteCount} Passenger</span>}
                      {Number(otrCount) > 0 && <span className="font-medium">{otrCount} OTR</span>}
                      {Number(tractorCount) > 0 && <span className="font-medium">{tractorCount} Semi</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Total: {computedPTE} PTE</p>
                  </div>

                  <div className="border-t pt-3">
                    <span className="text-muted-foreground text-sm">Signatures:</span>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4" />
                        <span className="text-sm">Generator:</span>
                        {hasGeneratorSig && generatorSigDataUrl ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span className="text-sm">Hauler:</span>
                        {hasHaulerSig && haulerSigDataUrl ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm">Receiver:</span>
                        {hasReceiverSig && receiverSigDataUrl ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {missingSignatures.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium text-sm text-amber-800">Missing Signatures</p>
                      <p className="text-sm text-amber-700">
                        The following signatures are missing: {missingSignatures.join(', ')}.
                        You can add them later from the drop-offs list or Receiver Signatures page.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Ready to Submit</p>
                    <p className="text-sm text-muted-foreground">
                      A manifest will be generated with captured signatures. 
                      {anySignaturesCaptured ? " Email will be sent after all signatures are complete." : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2 sm:justify-between">
          <div>
            {stepIndex > 0 && (
              <Button variant="outline" onClick={goBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {currentStep !== 'confirmation' ? (
              <Button
                onClick={goNext}
                disabled={
                  (currentStep === 'info' && !canProceedFromInfo) ||
                  (currentStep === 'generator-sig' && !canProceedFromGeneratorSig) ||
                  (currentStep === 'hauler-sig' && !canProceedFromHaulerSig) ||
                  (currentStep === 'receiver-sig' && !canProceedFromReceiverSig)
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting || createDropoffWithManifest.isPending}>
                {isSubmitting || createDropoffWithManifest.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete Drop-off'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      <CreateHaulerDialog open={showCreateHauler} onOpenChange={setShowCreateHauler} />
      <CreateClientDialog open={showCreateClient} onOpenChange={setShowCreateClient} />
    </Dialog>
  );
};
