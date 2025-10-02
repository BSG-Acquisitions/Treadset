import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { useHaulerCustomers } from "@/hooks/useHaulerCustomers";
import { useHaulerManifests } from "@/hooks/useHaulerManifests";
import { useNavigate } from "react-router-dom";

interface HaulerManifestWizardProps {
  haulerId: string;
  haulerName: string;
}

export const HaulerManifestWizard = ({ haulerId, haulerName }: HaulerManifestWizardProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { data: customers } = useHaulerCustomers(haulerId);
  const { createManifest } = useHaulerManifests(haulerId);

  // Form data
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [pteCount, setPteCount] = useState(0);
  const [otrCount, setOtrCount] = useState(0);
  const [tractorCount, setTractorCount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CHECK' | 'CARD'>('CASH');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [notes, setNotes] = useState("");
  
  // Signature data
  const [generatorPrintName, setGeneratorPrintName] = useState("");
  const [haulerPrintName, setHaulerPrintName] = useState("");
  const generatorSigRef = useRef<SignatureCanvas>(null);
  const haulerSigRef = useRef<SignatureCanvas>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manifestCreated, setManifestCreated] = useState(false);

  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);
  const totalTires = pteCount + otrCount + tractorCount;

  const handleNext = () => {
    if (step === 1 && !selectedCustomerId) return;
    if (step === 2 && totalTires === 0) return;
    if (step === 3 && !paymentAmount) return;
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!generatorSigRef.current || generatorSigRef.current.isEmpty()) return;
    if (!haulerSigRef.current || haulerSigRef.current.isEmpty()) return;
    if (!generatorPrintName || !haulerPrintName) return;

    setIsSubmitting(true);

    try {
      await createManifest.mutateAsync({
        hauler_customer_id: selectedCustomerId,
        pte_count: pteCount,
        otr_count: otrCount,
        tractor_count: tractorCount,
        payment_method: paymentMethod,
        payment_amount: paymentAmount,
        notes,
        generator_signature: generatorSigRef.current.toDataURL(),
        generator_print_name: generatorPrintName,
        hauler_signature: haulerSigRef.current.toDataURL(),
        hauler_print_name: haulerPrintName
      });

      setManifestCreated(true);
    } catch (error) {
      console.error('Failed to create manifest:', error);
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
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
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
                  setStep(1);
                  setSelectedCustomerId("");
                  setPteCount(0);
                  setOtrCount(0);
                  setTractorCount(0);
                  setPaymentAmount(0);
                  setNotes("");
                  setGeneratorPrintName("");
                  setHaulerPrintName("");
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

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-medium
              ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
            `}>
              {s}
            </div>
            {s < 4 && <div className={`w-24 h-1 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Customer Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{customer.company_name || customer.contact_name}</span>
                        {customer.city && <span className="text-sm text-muted-foreground">{customer.city}, {customer.state}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomer && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Customer Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Contact:</span>
                    <p>{selectedCustomer.contact_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p>{selectedCustomer.phone || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Email:</span>
                    <p>{selectedCustomer.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!selectedCustomerId}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Tire Counts */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Tire Counts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Passenger/Light Truck (PTE)</Label>
                <Input
                  type="number"
                  min="0"
                  value={pteCount}
                  onChange={(e) => setPteCount(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Off-The-Road (OTR)</Label>
                <Input
                  type="number"
                  min="0"
                  value={otrCount}
                  onChange={(e) => setOtrCount(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tractor</Label>
                <Input
                  type="number"
                  min="0"
                  value={tractorCount}
                  onChange={(e) => setTractorCount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="bg-primary/10 rounded-lg p-4">
              <p className="text-lg font-medium">
                Total Tires: <span className="text-primary">{totalTires}</span>
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleNext} disabled={totalTires === 0}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Payment Details */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount Paid</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleNext} disabled={!paymentAmount}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Signatures */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Signatures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Generator Signature */}
            <div className="space-y-3">
              <Label>Customer (Generator) Signature</Label>
              <Input
                placeholder="Print Name"
                value={generatorPrintName}
                onChange={(e) => setGeneratorPrintName(e.target.value)}
              />
              <div className="border-2 border-dashed rounded-lg p-2 bg-muted/10">
                <SignatureCanvas
                  ref={generatorSigRef}
                  canvasProps={{
                    width: 500,
                    height: 150,
                    className: 'signature-canvas w-full h-32 border rounded bg-background'
                  }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generatorSigRef.current?.clear()}
              >
                Clear
              </Button>
            </div>

            {/* Hauler Signature */}
            <div className="space-y-3">
              <Label>Your Signature (Hauler)</Label>
              <Input
                placeholder="Print Name"
                value={haulerPrintName}
                onChange={(e) => setHaulerPrintName(e.target.value)}
              />
              <div className="border-2 border-dashed rounded-lg p-2 bg-muted/10">
                <SignatureCanvas
                  ref={haulerSigRef}
                  canvasProps={{
                    width: 500,
                    height: 150,
                    className: 'signature-canvas w-full h-32 border rounded bg-background'
                  }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => haulerSigRef.current?.clear()}
              >
                Clear
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <FileText className="inline h-4 w-4 mr-2" />
                After you submit, this manifest will be sent to the facility for receiver signature.
                You'll receive the completed manifest once processed.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !generatorPrintName ||
                  !haulerPrintName ||
                  !generatorSigRef.current ||
                  !haulerSigRef.current
                }
              >
                {isSubmitting ? "Creating..." : "Create Manifest"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
