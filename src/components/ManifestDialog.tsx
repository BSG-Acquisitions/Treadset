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
  // Part 1 - Generator Info
  const [generatorName, setGeneratorName] = useState("");
  const [generatorAddress, setGeneratorAddress] = useState("");
  const [passengerTires, setPassengerTires] = useState(0);
  const [truckTires, setTruckTires] = useState(0);
  const [oversizedTires, setOversizedTires] = useState(0);
  const [pteCount, setPteCount] = useState(0);
  const [grossWeight, setGrossWeight] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const [netWeight, setNetWeight] = useState("");
  
  // Part 2 - Hauler Info
  const [selectedDriver, setSelectedDriver] = useState("");
  const [haulerName, setHaulerName] = useState("");
  const [haulerAddress, setHaulerAddress] = useState("");
  const [haulerLicense, setHaulerLicense] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  
  // Part 3 - Processor Info
  const [selectedProcessor, setSelectedProcessor] = useState("");
  const [processorName, setProcessorName] = useState("");
  const [processorAddress, setProcessorAddress] = useState("");
  const [processorLicense, setProcessorLicense] = useState("");
  const [processingMethod, setProcessingMethod] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState("");

  const generatorSigRef = useRef<SignatureCanvas>(null);
  const haulerSigRef = useRef<SignatureCanvas>(null);
  const processorSigRef = useRef<SignatureCanvas>(null);
  
  const { toast } = useToast();

  // Predefined options
  const driverOptions = [
    { value: "john_doe", label: "John Doe", haulerName: "BSG Logistics", address: "123 Main St, Austin, TX", license: "HAU-001" },
    { value: "jane_smith", label: "Jane Smith", haulerName: "BSG Logistics", address: "123 Main St, Austin, TX", license: "HAU-001" },
    { value: "mike_johnson", label: "Mike Johnson", haulerName: "BSG Logistics", address: "123 Main St, Austin, TX", license: "HAU-001" }
  ];

  const processorOptions = [
    { value: "bsg_facility", label: "BSG Processing Facility", address: "456 Industrial Blvd, Austin, TX", license: "PROC-001", method: "Shredding & Recycling" },
    { value: "eco_tire", label: "Eco Tire Solutions", address: "789 Green Way, Austin, TX", license: "PROC-002", method: "Crumb Rubber Production" },
    { value: "liberty_tire", label: "Liberty Tire Recycling", address: "321 Recycle Dr, Austin, TX", license: "PROC-003", method: "Tire Derived Fuel" }
  ];

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setCurrentStep(1);
      setGeneratorName("");
      setGeneratorAddress("");
      setPassengerTires(0);
      setTruckTires(0);
      setOversizedTires(0);
      setPteCount(0);
      setGrossWeight("");
      setTareWeight("");
      setNetWeight("");
      setSelectedDriver("");
      setHaulerName("");
      setHaulerAddress("");
      setHaulerLicense("");
      setVehicleInfo("");
      setSelectedProcessor("");
      setProcessorName("");
      setProcessorAddress("");
      setProcessorLicense("");
      setProcessingMethod("");
      setGeneratedPdfUrl("");
      clearSignatures();
    }
  }, [open]);

  const clearSignatures = () => {
    generatorSigRef.current?.clear();
    haulerSigRef.current?.clear();
    processorSigRef.current?.clear();
  };

  const handleDriverSelection = (driverValue: string) => {
    setSelectedDriver(driverValue);
    const driver = driverOptions.find(d => d.value === driverValue);
    if (driver) {
      setHaulerName(driver.haulerName);
      setHaulerAddress(driver.address);
      setHaulerLicense(driver.license);
      setVehicleInfo(`${pickup.client?.company_name} Route Vehicle`);
    }
  };

  const handleProcessorSelection = (processorValue: string) => {
    setSelectedProcessor(processorValue);
    const processor = processorOptions.find(p => p.value === processorValue);
    if (processor) {
      setProcessorName(processor.label);
      setProcessorAddress(processor.address);
      setProcessorLicense(processor.license);
      setProcessingMethod(processor.method);
    }
  };

  const generateManifest = async () => {
    if (!generatorName || !selectedDriver || !selectedProcessor) {
      toast({
        title: "Missing Information",
        description: "Please fill in generator name, select driver and processor.",
        variant: "destructive",
      });
      return;
    }

    if (generatorSigRef.current?.isEmpty() || haulerSigRef.current?.isEmpty() || processorSigRef.current?.isEmpty()) {
      toast({
        title: "Signatures Required",
        description: "All three signatures are required: Generator, Hauler, and Processor.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Get signature data
      const generatorSigData = generatorSigRef.current?.toDataURL();
      const haulerSigData = haulerSigRef.current?.toDataURL();
      const processorSigData = processorSigRef.current?.toDataURL();

      // Call the manifest generation function
      const { data, error } = await supabase.functions.invoke('manifest-finalize', {
        body: {
          pickup_id: pickup.id,
          manifest_data: {
            ...manifestData,
            generator_name: generatorName,
            generator_address: generatorAddress,
            passenger_count: passengerTires,
            truck_count: truckTires,
            oversized_count: oversizedTires,
            pte_count: pteCount,
            gross_weight: grossWeight,
            tare_weight: tareWeight,
            net_weight: netWeight,
            generator_signature_name: generatorName,
            generator_date: new Date().toISOString(),
            hauler_name: haulerName,
            hauler_address: haulerAddress,
            hauler_license: haulerLicense,
            vehicle_info: vehicleInfo,
            driver_name: selectedDriver,
            driver_signature_name: selectedDriver,
            hauler_date: new Date().toISOString(),
            processor_name: processorName,
            processor_address: processorAddress,
            processor_license: processorLicense,
            processing_method: processingMethod,
            processor_signature_name: processorName,
            processor_date: new Date().toISOString(),
            generator_signature: generatorSigData,
            hauler_signature: haulerSigData,
            processor_signature: processorSigData,
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
        description: "State tire manifest has been created successfully.",
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

  const generateCalibration = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manifest-finalize', {
        body: {
          pickup_id: pickup.id,
          manifest_data: {
            ...manifestData
          },
          calibrate: true,
        }
      });
      if (error) throw error;
      setGeneratedPdfUrl(data.pdf_url);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error generating calibration PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadManifest = async () => {
    if (generatedPdfUrl) {
      try {
        // Fetch the PDF as a blob
        const response = await fetch(generatedPdfUrl);
        const blob = await response.blob();
        
        // Create a temporary URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary anchor element and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = `manifest-${pickup.id}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading PDF:', error);
        // Fallback to opening in new tab
        window.open(generatedPdfUrl, '_blank');
      }
    }
  };

  const emailManifest = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-manifest-email', {
        body: {
          pickup_id: pickup.id,
          customer_email: generatorName + "@company.com", // Placeholder email logic
          manifest_url: generatedPdfUrl,
          customer_name: generatorName,
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Manifest sent successfully`,
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
            {/* Part 1 - Scrap Tire Generator */}
            <div className="bg-secondary/20 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-lg">Part 1: Scrap Tire Generator Certification</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="generatorName">Generator Name/Company *</Label>
                  <Input
                    id="generatorName"
                    value={generatorName}
                    onChange={(e) => setGeneratorName(e.target.value)}
                    placeholder="Enter company/person generating tires"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="generatorAddress">Generator Address</Label>
                  <Input
                    id="generatorAddress"
                    value={generatorAddress}
                    onChange={(e) => setGeneratorAddress(e.target.value)}
                    placeholder="Generator address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passengerTires">Passenger Car Tires</Label>
                  <Input
                    id="passengerTires"
                    type="number"
                    value={passengerTires}
                    onChange={(e) => setPassengerTires(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="truckTires">Truck Tires</Label>
                  <Input
                    id="truckTires"
                    type="number"
                    value={truckTires}
                    onChange={(e) => setTruckTires(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oversizedTires">Oversized Tires</Label>
                  <Input
                    id="oversizedTires"
                    type="number"
                    value={oversizedTires}
                    onChange={(e) => setOversizedTires(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pteCount">PTE Count</Label>
                  <Input
                    id="pteCount"
                    type="number"
                    value={pteCount}
                    onChange={(e) => setPteCount(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grossWeight">Gross Weight (lbs)</Label>
                  <Input
                    id="grossWeight"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tareWeight">Tare Weight (lbs)</Label>
                  <Input
                    id="tareWeight"
                    value={tareWeight}
                    onChange={(e) => setTareWeight(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="netWeight">Net Weight (lbs)</Label>
                  <Input
                    id="netWeight"
                    value={netWeight}
                    onChange={(e) => setNetWeight(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Part 2 - Scrap Tire Hauler */}
            <div className="bg-secondary/20 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-lg">Part 2: Scrap Tire Hauler</h3>
              
              <div className="space-y-2">
                <Label htmlFor="driverSelect">Select Driver *</Label>
                <select
                  id="driverSelect"
                  value={selectedDriver}
                  onChange={(e) => handleDriverSelection(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="">Select a driver...</option>
                  {driverOptions.map((driver) => (
                    <option key={driver.value} value={driver.value}>
                      {driver.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedDriver && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hauler Company</Label>
                    <Input value={haulerName} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>License Number</Label>
                    <Input value={haulerLicense} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Hauler Address</Label>
                    <Input value={haulerAddress} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle Information</Label>
                    <Input value={vehicleInfo} readOnly className="bg-muted" />
                  </div>
                </div>
              )}
            </div>

            {/* Part 3 - Scrap Tire Processor */}
            <div className="bg-secondary/20 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-lg">Part 3: Scrap Tire Processor</h3>
              
              <div className="space-y-2">
                <Label htmlFor="processorSelect">Select Processing Facility *</Label>
                <select
                  id="processorSelect"
                  value={selectedProcessor}
                  onChange={(e) => handleProcessorSelection(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="">Select processing facility...</option>
                  {processorOptions.map((processor) => (
                    <option key={processor.value} value={processor.value}>
                      {processor.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProcessor && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Processor Name</Label>
                    <Input value={processorName} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>License Number</Label>
                    <Input value={processorLicense} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Processor Address</Label>
                    <Input value={processorAddress} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Processing Method</Label>
                    <Input value={processingMethod} readOnly className="bg-muted" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={!generatorName || !selectedDriver || !selectedProcessor}
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
                All three parties must sign to finalize the state tire manifest.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Generator Signature */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Part 1: Generator Signature</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => generatorSigRef.current?.clear()}
                  >
                    Clear
                  </Button>
                </div>
                <div className="border border-border rounded-lg p-2 bg-background">
                  <SignatureCanvas
                    ref={generatorSigRef}
                    canvasProps={{
                      className: "signature-canvas w-full h-32 bg-white rounded",
                      style: { width: '100%', height: '128px' }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Scrap Tire Generator: {generatorName}
                </p>
              </div>

              {/* Hauler Signature */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Part 2: Hauler Signature</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => haulerSigRef.current?.clear()}
                  >
                    Clear
                  </Button>
                </div>
                <div className="border border-border rounded-lg p-2 bg-background">
                  <SignatureCanvas
                    ref={haulerSigRef}
                    canvasProps={{
                      className: "signature-canvas w-full h-32 bg-white rounded",
                      style: { width: '100%', height: '128px' }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Authorized Hauler: {selectedDriver} ({haulerName})
                </p>
              </div>

              {/* Processor Signature */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Part 3: Processor Signature</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => processorSigRef.current?.clear()}
                  >
                    Clear
                  </Button>
                </div>
                <div className="border border-border rounded-lg p-2 bg-background">
                  <SignatureCanvas
                    ref={processorSigRef}
                    canvasProps={{
                      className: "signature-canvas w-full h-32 bg-white rounded",
                      style: { width: '100%', height: '128px' }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Authorized Processor: {processorName}
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
              
              <Button
                onClick={emailManifest}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Email Manifest
              </Button>
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