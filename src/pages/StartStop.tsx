import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SignatureCanvas from "react-signature-canvas";
import { SearchableDropdown } from "@/components/SearchableDropdown";

interface Generator {
  generator_id: string;
  generator_name: string;
  generator_mailing_address?: string;
  generator_city?: string;
  generator_state?: string;
  generator_zip?: string;
  generator_phone?: string;
}

interface Hauler {
  hauler_id: string;
  hauler_name: string;
  hauler_mailing_address?: string;
  hauler_city?: string;
  hauler_state?: string;
  hauler_zip?: string;
  hauler_phone?: string;
  hauler_mi_reg?: string;
}

interface Receiver {
  receiver_id: string;
  receiver_name: string;
  receiver_mailing_address?: string;
  receiver_city?: string;
  receiver_state?: string;
  receiver_zip?: string;
  receiver_phone?: string;
}

export default function StartStop() {
  const { toast } = useToast();
  const [selectedGenerator, setSelectedGenerator] = useState<Generator | null>(null);
  const [selectedHauler, setSelectedHauler] = useState<Hauler | null>(null);
  const [selectedReceiver, setSelectedReceiver] = useState<Receiver | null>(null);
  
  // Form data
  const [manifestNumber, setManifestNumber] = useState("");
  const [passenger, setPassenger] = useState("");
  const [truck, setTruck] = useState("");
  const [oversized, setOversized] = useState("");
  const [pte, setPte] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const [generatorPrintName, setGeneratorPrintName] = useState("");
  const [haulerPrintName, setHaulerPrintName] = useState("");
  const [receiverPrintName, setReceiverPrintName] = useState("");
  const [generatorDate, setGeneratorDate] = useState<Date>();
  const [receiverDate, setReceiverDate] = useState<Date>();

  // Signature refs
  const generatorSigRef = useRef<SignatureCanvas>(null);
  const haulerSigRef = useRef<SignatureCanvas>(null);
  const receiverSigRef = useRef<SignatureCanvas>(null);

  // Loading states
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const netWeight = (Number(grossWeight) || 0) - (Number(tareWeight) || 0);

  const fetchGenerators = useCallback(async (search: string) => {
    // For now, return mock data - implement with actual database tables later
    return [
      {
        generator_id: "1",
        generator_name: "Sample Generator",
        generator_mailing_address: "123 Main St",
        generator_city: "Austin",
        generator_state: "TX",
        generator_zip: "78701",
        generator_phone: "(512) 555-0123"
      }
    ].filter(g => g.generator_name.toLowerCase().includes(search.toLowerCase()));
  }, []);

  const fetchHaulers = useCallback(async (search: string) => {
    // Mock data for now - replace with actual database calls when tables exist
    return [
      {
        hauler_id: "1",
        hauler_name: "ABC Transport",
        hauler_mailing_address: "123 Main St",
        hauler_city: "Austin",
        hauler_state: "TX",
        hauler_zip: "78701",
        hauler_phone: "(512) 555-0123",
        hauler_mi_reg: "TX-12345"
      },
      {
        hauler_id: "2",
        hauler_name: "XYZ Logistics", 
        hauler_mailing_address: "456 Oak Ave",
        hauler_city: "Dallas",
        hauler_state: "TX",
        hauler_zip: "75201",
        hauler_phone: "(214) 555-0456",
        hauler_mi_reg: "TX-67890"
      }
    ].filter(h => h.hauler_name.toLowerCase().includes(search.toLowerCase()));
  }, []);

  const fetchReceivers = useCallback(async (search: string) => {
    // Mock data for now - replace with actual database calls when tables exist
    return [
      {
        receiver_id: "1",
        receiver_name: "Texas Tire Recycling",
        receiver_mailing_address: "789 Industrial Blvd",
        receiver_city: "Houston",
        receiver_state: "TX",
        receiver_zip: "77001",
        receiver_phone: "(713) 555-0789"
      },
      {
        receiver_id: "2",
        receiver_name: "Green Tire Processing",
        receiver_mailing_address: "321 Factory Rd",
        receiver_city: "San Antonio", 
        receiver_state: "TX",
        receiver_zip: "78201",
        receiver_phone: "(210) 555-0321"
      }
    ].filter(r => r.receiver_name.toLowerCase().includes(search.toLowerCase()));
  }, []);

  const uploadSignature = async (signatureCanvas: SignatureCanvas, stopId: string, role: string) => {
    if (!signatureCanvas || signatureCanvas.isEmpty()) return null;
    
    const dataUrl = signatureCanvas.toDataURL();
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    const filename = `${stopId}/${role}.png`;
    const { data, error } = await supabase.storage
      .from('manifests')
      .upload(`signatures/${filename}`, blob, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (error) throw error;
    return `signatures/${filename}`;
  };

  const saveStop = async () => {
    if (!selectedGenerator || !selectedHauler || !selectedReceiver) {
      toast({
        title: "Missing selections",
        description: "Please select generator, hauler, and receiver.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      const stopData = {
        generator_id: selectedGenerator.generator_id,
        hauler_id: selectedHauler.hauler_id,
        receiver_id: selectedReceiver.receiver_id,
        manifest_number: manifestNumber,
        tire_counts: {
          passenger: Number(passenger) || 0,
          truck: Number(truck) || 0,
          oversized: Number(oversized) || 0,
          pte: Number(pte) || 0
        },
        gross_weight: Number(grossWeight) || 0,
        tare_weight: Number(tareWeight) || 0,
        net_weight: netWeight,
        generator_date: generatorDate,
        receiver_date: receiverDate,
        generator_print_name: generatorPrintName,
        hauler_print_name: haulerPrintName,
        receiver_print_name: receiverPrintName
      };

      // For now, simulate saving - implement with actual database later
      const stop = { id: Date.now().toString() };
      console.log('Would save stop data:', stopData);

      // Upload signatures (mock for now)
      if (generatorSigRef.current && !generatorSigRef.current.isEmpty()) {
        console.log('Would upload generator signature for stop:', stop.id);
      }
      if (haulerSigRef.current && !haulerSigRef.current.isEmpty()) {
        console.log('Would upload hauler signature for stop:', stop.id);
      }
      if (receiverSigRef.current && !receiverSigRef.current.isEmpty()) {
        console.log('Would upload receiver signature for stop:', stop.id);
      }

      toast({
        title: "Stop saved",
        description: "Stop data has been saved successfully."
      });

    } catch (error: any) {
      console.error('Error saving stop:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save stop data.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const generatePdf = async () => {
    if (!selectedGenerator || !selectedHauler || !selectedReceiver) {
      toast({
        title: "Missing selections",
        description: "Please select generator, hauler, and receiver.",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingPdf(true);

      // First save the stop
      await saveStop();

      // Prepare overlay data
      const fmtDate = (d?: Date) => d ? d.toLocaleDateString('en-US') : '';
      
      const overlayData = {
        ...selectedGenerator,
        ...selectedHauler,
        ...selectedReceiver,
        count_passenger_car: Number(passenger) || 0,
        count_truck: Number(truck) || 0,
        count_oversized: Number(oversized) || 0,
        count_pte: Number(pte) || 0,
        gross_weight: Number(grossWeight) || 0,
        tare_weight: Number(tareWeight) || 0,
        net_weight: netWeight,
        manifest_number: manifestNumber,
        generator_print_name: generatorPrintName,
        hauler_print_name: haulerPrintName,
        receiver_print_name: receiverPrintName,
        generator_date: fmtDate(generatorDate),
        receiver_date: fmtDate(receiverDate)
      };

      const { data, error } = await supabase.functions.invoke('generate-manifest-pdf', {
        body: {
          template_name: 'STATE_Manifest_v1.pdf',
          version: 'v1',
          overlay_data: overlayData
        }
      });

      if (error) throw error;

      if (data?.pdf_url) {
        window.open(data.pdf_url, '_blank');
        toast({
          title: "PDF generated",
          description: "Manifest PDF has been generated and opened."
        });
      }

    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF generation failed",
        description: error.message || "Failed to generate PDF.",
        variant: "destructive"
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Start Stop</h1>
          <p className="text-muted-foreground">Create a new manifest stop</p>
        </div>

        {/* Entity Selection */}
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
                  {selectedGenerator.generator_phone && (
                    <div><strong>Phone:</strong> {selectedGenerator.generator_phone}</div>
                  )}
                </div>
              )}
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
                  {selectedReceiver.receiver_phone && (
                    <div><strong>Phone:</strong> {selectedReceiver.receiver_phone}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Form Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Manifest Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="manifest-number">Manifest Number</Label>
                <Input
                  id="manifest-number"
                  value={manifestNumber}
                  onChange={(e) => setManifestNumber(e.target.value)}
                  placeholder="Enter manifest number"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="passenger">Passenger Count</Label>
                <Input
                  id="passenger"
                  type="number"
                  value={passenger}
                  onChange={(e) => setPassenger(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="truck">Truck Count</Label>
                <Input
                  id="truck"
                  type="number"
                  value={truck}
                  onChange={(e) => setTruck(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="oversized">Oversized Count</Label>
                <Input
                  id="oversized"
                  type="number"
                  value={oversized}
                  onChange={(e) => setOversized(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="pte">PTE Count</Label>
                <Input
                  id="pte"
                  type="number"
                  value={pte}
                  onChange={(e) => setPte(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="gross-weight">Gross Weight</Label>
                <Input
                  id="gross-weight"
                  type="number"
                  step="0.01"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="tare-weight">Tare Weight</Label>
                <Input
                  id="tare-weight"
                  type="number"
                  step="0.01"
                  value={tareWeight}
                  onChange={(e) => setTareWeight(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="net-weight">Net Weight (Computed)</Label>
                <Input
                  id="net-weight"
                  value={netWeight.toFixed(2)}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="generator-print">Generator Print Name</Label>
                <Input
                  id="generator-print"
                  value={generatorPrintName}
                  onChange={(e) => setGeneratorPrintName(e.target.value)}
                  placeholder="Printed name"
                />
              </div>
              <div>
                <Label htmlFor="hauler-print">Hauler Print Name</Label>
                <Input
                  id="hauler-print"
                  value={haulerPrintName}
                  onChange={(e) => setHaulerPrintName(e.target.value)}
                  placeholder="Printed name"
                />
              </div>
              <div>
                <Label htmlFor="receiver-print">Receiver Print Name</Label>
                <Input
                  id="receiver-print"
                  value={receiverPrintName}
                  onChange={(e) => setReceiverPrintName(e.target.value)}
                  placeholder="Printed name"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Generator Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !generatorDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {generatorDate ? format(generatorDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={generatorDate}
                      onSelect={setGeneratorDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Receiver Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !receiverDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {receiverDate ? format(receiverDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={receiverDate}
                      onSelect={setReceiverDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signatures */}
        <Card>
          <CardHeader>
            <CardTitle>Signatures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <Label className="text-sm font-medium">Generator Signature</Label>
                <div className="mt-2 border rounded-lg">
                  <SignatureCanvas
                    ref={generatorSigRef}
                    canvasProps={{
                      width: 300,
                      height: 150,
                      className: 'signature-canvas w-full'
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => generatorSigRef.current?.clear()}
                >
                  Clear
                </Button>
              </div>

              <div>
                <Label className="text-sm font-medium">Hauler Signature</Label>
                <div className="mt-2 border rounded-lg">
                  <SignatureCanvas
                    ref={haulerSigRef}
                    canvasProps={{
                      width: 300,
                      height: 150,
                      className: 'signature-canvas w-full'
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => haulerSigRef.current?.clear()}
                >
                  Clear
                </Button>
              </div>

              <div>
                <Label className="text-sm font-medium">Receiver Signature</Label>
                <div className="mt-2 border rounded-lg">
                  <SignatureCanvas
                    ref={receiverSigRef}
                    canvasProps={{
                      width: 300,
                      height: 150,
                      className: 'signature-canvas w-full'
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => receiverSigRef.current?.clear()}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={saveStop} disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Stop
              </>
            )}
          </Button>

          <Button onClick={generatePdf} disabled={generatingPdf} className="flex-1">
            {generatingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}