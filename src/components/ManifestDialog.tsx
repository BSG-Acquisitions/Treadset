import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, PenTool, Download, Send, User, Building2 } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

interface ManifestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickup: {
    id: string;
    client?: { company_name: string };
    location?: { name?: string; address: string };
    pickup_date: string;
    pte_count?: number;
    otr_count?: number;
    tractor_count?: number;
    notes?: string;
  };
  manifestData: {
    pte_off_rim: number;
    pte_on_rim: number;
    commercial_17_5_19_5_off: number;
    commercial_17_5_19_5_on: number;
    commercial_22_5_off: number;
    commercial_22_5_on: number;
    otr_count: number;
    tractor_count: number;
    weight_tons?: number;
    volume_yards?: number;
  };
}

export function ManifestDialog({ open, onOpenChange, pickup, manifestData }: ManifestDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerTitle, setCustomerTitle] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [driverName, setDriverName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState("");

  const driverSigRef = useRef<SignatureCanvas>(null);
  const customerSigRef = useRef<SignatureCanvas>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setCurrentStep(1);
      setCustomerName("");
      setCustomerTitle("");
      setCustomerEmail("");
      setDriverName("");
      setGeneratedPdfUrl("");
      clearSignatures();
    }
  }, [open]);

  const clearSignatures = () => {
    driverSigRef.current?.clear();
    customerSigRef.current?.clear();
  };

  const clearDriverSignature = () => {
    driverSigRef.current?.clear();
  };

  const clearCustomerSignature = () => {
    customerSigRef.current?.clear();
  };

  const generateManifest = async () => {
    if (!customerName || !driverName) {
      toast({
        title: "Missing Information",
        description: "Please fill in both customer and driver names.",
        variant: "destructive",
      });
      return;
    }

    if (driverSigRef.current?.isEmpty() || customerSigRef.current?.isEmpty()) {
      toast({
        title: "Signatures Required",
        description: "Both driver and customer signatures are required.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Get signature data
      const driverSigData = driverSigRef.current?.toDataURL();
      const customerSigData = customerSigRef.current?.toDataURL();

      // Call the manifest generation function
      const { data, error } = await supabase.functions.invoke('manifest-finalize', {
        body: {
          pickup_id: pickup.id,
          manifest_data: {
            ...manifestData,
            customer_name: customerName,
            customer_title: customerTitle,
            customer_email: customerEmail,
            driver_name: driverName,
            driver_signature: driverSigData,
            customer_signature: customerSigData,
            client_name: pickup.client?.company_name,
            location_address: pickup.location?.address,
            pickup_date: pickup.pickup_date,
          }
        }
      });

      if (error) throw error;

      setGeneratedPdfUrl(data.pdf_url);
      setCurrentStep(3);

      toast({
        title: "Manifest Generated",
        description: "State manifest has been created successfully.",
      });
    } catch (error) {
      console.error('Error generating manifest:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate manifest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadManifest = () => {
    if (generatedPdfUrl) {
      window.open(generatedPdfUrl, '_blank');
    }
  };

  const emailManifest = async () => {
    if (!customerEmail) {
      toast({
        title: "Email Required",
        description: "Please enter customer email to send manifest.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-manifest-email', {
        body: {
          pickup_id: pickup.id,
          customer_email: customerEmail,
          manifest_url: generatedPdfUrl,
          customer_name: customerName,
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Manifest sent to ${customerEmail}`,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Email Failed",
        description: "Failed to send manifest email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleComplete = () => {
    onOpenChange(false);
    toast({
      title: "Pickup Complete",
      description: "Manifest has been finalized and pickup marked complete.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-background border z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-primary" />
            State Tire Manifest
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-brand-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? 'bg-brand-primary text-white' : 'bg-muted'}`}>
                1
              </div>
              <span className="text-sm">Details</span>
            </div>
            <div className={`w-8 h-1 ${currentStep >= 2 ? 'bg-brand-primary' : 'bg-muted'}`} />
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-brand-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? 'bg-brand-primary text-white' : 'bg-muted'}`}>
                2
              </div>
              <span className="text-sm">Signatures</span>
            </div>
            <div className={`w-8 h-1 ${currentStep >= 3 ? 'bg-brand-primary' : 'bg-muted'}`} />
            <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-brand-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 3 ? 'bg-brand-primary text-white' : 'bg-muted'}`}>
                3
              </div>
              <span className="text-sm">Complete</span>
            </div>
          </div>
        </div>

        {/* Step 1: Details & Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Pickup Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Client:</strong> {pickup.client?.company_name}
                </div>
                <div>
                  <strong>Date:</strong> {new Date(pickup.pickup_date).toLocaleDateString()}
                </div>
                <div className="col-span-2">
                  <strong>Location:</strong> {pickup.location?.address}
                </div>
              </div>
            </div>

            <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Tire Counts</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>PTE Off Rim:</strong> {manifestData.pte_off_rim}</div>
                <div><strong>PTE On Rim:</strong> {manifestData.pte_on_rim}</div>
                <div><strong>Commercial 17.5/19.5 Off:</strong> {manifestData.commercial_17_5_19_5_off}</div>
                <div><strong>Commercial 17.5/19.5 On:</strong> {manifestData.commercial_17_5_19_5_on}</div>
                <div><strong>Commercial 22.5 Off:</strong> {manifestData.commercial_22_5_off}</div>
                <div><strong>Commercial 22.5 On:</strong> {manifestData.commercial_22_5_on}</div>
                <div><strong>OTR:</strong> {manifestData.otr_count}</div>
                <div><strong>Tractor:</strong> {manifestData.tractor_count}</div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerTitle">Customer Title</Label>
                  <Input
                    id="customerTitle"
                    value={customerTitle}
                    onChange={(e) => setCustomerTitle(e.target.value)}
                    placeholder="e.g., Manager, Owner"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Customer Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverName">Driver Name *</Label>
                  <Input
                    id="driverName"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Enter driver name"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={!customerName || !driverName}
              >
                Continue to Signatures
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Signatures */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Digital Signatures Required</h3>
              <p className="text-sm text-muted-foreground">
                Both driver and customer must sign to finalize the manifest.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Driver Signature</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearDriverSignature}
                  >
                    Clear
                  </Button>
                </div>
                <div className="border border-border rounded-lg p-2 bg-background">
                  <SignatureCanvas
                    ref={driverSigRef}
                    canvasProps={{
                      className: "signature-canvas w-full h-32 bg-white rounded",
                      style: { width: '100%', height: '128px' }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Driver: {driverName}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Customer Signature</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearCustomerSignature}
                  >
                    Clear
                  </Button>
                </div>
                <div className="border border-border rounded-lg p-2 bg-background">
                  <SignatureCanvas
                    ref={customerSigRef}
                    canvasProps={{
                      className: "signature-canvas w-full h-32 bg-white rounded",
                      style: { width: '100%', height: '128px' }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Customer: {customerName}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button
                onClick={generateManifest}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <>Processing...</>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Generate Manifest
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 3 && (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-brand-success/20 rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-brand-success" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-brand-success">Manifest Generated Successfully!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  State tire manifest has been created and is ready for download.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={downloadManifest}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              
              {customerEmail && (
                <Button
                  onClick={emailManifest}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Email to Customer
                </Button>
              )}
            </div>

            <Separator />

            <div className="flex justify-center">
              <Button
                onClick={handleComplete}
                className="flex items-center gap-2"
              >
                Complete Pickup
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}