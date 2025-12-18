import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useClients } from "@/hooks/useClients";
import { useCreateDropoffWithManifest } from "@/hooks/useCreateDropoffWithManifest";
import { useHaulers } from "@/hooks/useHaulers";
import { useReceivers } from "@/hooks/useReceivers";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, DollarSign, Factory, Truck, Building2, Plus, ChevronLeft, ChevronRight, Pen, CheckCircle2, Eraser, Loader2 } from "lucide-react";
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

type WizardStep = 'info' | 'hauler-sig' | 'receiver-sig' | 'confirmation';

const STEPS: WizardStep[] = ['info', 'hauler-sig', 'receiver-sig', 'confirmation'];

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
  
  // Signature state
  const [haulerPrintName, setHaulerPrintName] = useState("");
  const [haulerSigDataUrl, setHaulerSigDataUrl] = useState<string | null>(null);
  const [receiverPrintName, setReceiverPrintName] = useState("");
  const [receiverSigDataUrl, setReceiverSigDataUrl] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  
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
    setHaulerPrintName("");
    setHaulerSigDataUrl(null);
    setReceiverPrintName("");
    setReceiverSigDataUrl(null);
    setSelectedEmployeeId("");
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
      if (!haulerSigDataUrl || !haulerPrintName) throw new Error("Hauler signature is required");
      if (!receiverSigDataUrl || !receiverPrintName) throw new Error("Receiver signature is required");
      if (!selectedReceiverId) throw new Error("Please select a receiver");

      const orgId = user?.currentOrganization?.id || "";
      const timestamp = new Date().toISOString();
      const now = new Date();
      const localDate = format(now, 'yyyy-MM-dd');
      const localTime = format(now, 'HH:mm:ss');

      // Upload hauler signature
      const haulerBlob = dataURLtoBlob(haulerSigDataUrl);
      const haulerFileName = `hauler_signature_${Date.now()}.png`;
      const haulerUploadPath = `${orgId}/signatures/${haulerFileName}`;
      const { error: haulerUploadError } = await supabase.storage
        .from('manifests')
        .upload(haulerUploadPath, haulerBlob, { contentType: 'image/png', upsert: false });
      if (haulerUploadError) throw new Error(`Hauler signature upload failed: ${haulerUploadError.message}`);

      // Upload receiver signature
      const receiverBlob = dataURLtoBlob(receiverSigDataUrl);
      const receiverFileName = `receiver_signature_${Date.now()}.png`;
      const receiverUploadPath = `${orgId}/signatures/${receiverFileName}`;
      const { error: receiverUploadError } = await supabase.storage
        .from('manifests')
        .upload(receiverUploadPath, receiverBlob, { contentType: 'image/png', upsert: false });
      if (receiverUploadError) throw new Error(`Receiver signature upload failed: ${receiverUploadError.message}`);

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
          hauler_sig_path: haulerUploadPath,
          hauler_signed_by: haulerPrintName,
          hauler_signed_at: timestamp,
          receiver_sig_path: receiverUploadPath,
          receiver_signed_by: receiverPrintName,
          receiver_signed_at: timestamp,
        },
        vehicleId: undefined,
        receiverId: selectedReceiverId,
      });

      handleClose();
    } catch (error: any) {
      console.error('Error processing dropoff:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedFromInfo = customerId && (pteCount || otrCount || tractorCount) && manualRevenue && Number(manualRevenue) > 0;
  const canProceedFromHaulerSig = haulerSigDataUrl && haulerPrintName;
  const canProceedFromReceiverSig = receiverSigDataUrl && receiverPrintName && selectedReceiverId;

  const goNext = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      // Capture signature data before moving
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
              currentStep === 'hauler-sig' ? 'Hauler/Generator Signature' :
              currentStep === 'receiver-sig' ? 'Receiver Signature' :
              'Review & Submit'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                idx <= stepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {idx < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  "w-12 h-1 mx-1",
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

          {/* Step 2: Hauler Signature */}
          {currentStep === 'hauler-sig' && (
            <Card className="border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Pen className="h-5 w-5 text-primary" />
                  <span className="font-medium text-lg">Hauler/Generator Signature</span>
                </div>
                <p className="text-sm text-muted-foreground">The person dropping off the tires must sign below</p>
                
                <div className="space-y-2">
                  <Label>Print Name *</Label>
                  <Input
                    placeholder="Enter hauler/generator name"
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
              </CardContent>
            </Card>
          )}

          {/* Step 3: Receiver Signature */}
          {currentStep === 'receiver-sig' && (
            <Card className="border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Pen className="h-5 w-5 text-primary" />
                  <span className="font-medium text-lg">Receiver Signature (BSG Staff)</span>
                </div>
                <p className="text-sm text-muted-foreground">BSG staff member receiving the tires must sign below</p>

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
              </CardContent>
            </Card>
          )}

          {/* Step 4: Confirmation */}
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

                  <div className="border-t pt-3 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground text-sm">Hauler Signed:</span>
                      <p className="font-medium">{haulerPrintName} ✓</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Receiver Signed:</span>
                      <p className="font-medium">{receiverPrintName} ✓</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-muted p-4 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Ready to Submit</p>
                    <p className="text-sm text-muted-foreground">
                      A manifest will be generated with all signatures and emailed to the client.
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
