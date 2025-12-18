import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SignatureCanvas from "react-signature-canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEmployees } from "@/hooks/useEmployees";
import { useReceivers } from "@/hooks/useReceivers";
import { useGenerateDropoffManifest } from "@/hooks/useGenerateDropoffManifest";
import { Loader2, Pen, Eraser, Factory, Truck, Building2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Dropoff = Database["public"]["Tables"]["dropoffs"]["Row"];

interface AddDropoffSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropoff: Dropoff;
}

export const AddDropoffSignatureDialog = ({ open, onOpenChange, dropoff }: AddDropoffSignatureDialogProps) => {
  // Determine which tab should be active based on missing signatures
  const getDefaultTab = () => {
    if (!(dropoff as any).generator_sig_path) return "generator";
    if (!dropoff.hauler_sig_path) return "hauler";
    if (!dropoff.receiver_sig_path) return "receiver";
    return "generator";
  };

  const [activeTab, setActiveTab] = useState<string>(getDefaultTab());
  const [generatorPrintName, setGeneratorPrintName] = useState("");
  const [haulerPrintName, setHaulerPrintName] = useState("");
  const [receiverPrintName, setReceiverPrintName] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedReceiverId, setSelectedReceiverId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const generatorSigRef = useRef<SignatureCanvas | null>(null);
  const haulerSigRef = useRef<SignatureCanvas | null>(null);
  const receiverSigRef = useRef<SignatureCanvas | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: employees } = useEmployees();
  const { data: receivers } = useReceivers();
  const generateManifest = useGenerateDropoffManifest();

  const needsGeneratorSig = !(dropoff as any).generator_sig_path;
  const needsHaulerSig = !dropoff.hauler_sig_path;
  const needsReceiverSig = !dropoff.receiver_sig_path;

  const printNameOptions = employees
    ?.filter(emp => emp.isActive)
    ?.map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      signatureDataUrl: emp.signatureDataUrl
    }))
    ?.filter(opt => opt.name.length > 0) || [];

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const employee = employees?.find(emp => emp.id === employeeId);
    if (employee) {
      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      setReceiverPrintName(fullName);
      if (employee.signatureDataUrl && receiverSigRef.current) {
        receiverSigRef.current.fromDataURL(employee.signatureDataUrl);
      }
    }
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
    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const updateData: Record<string, any> = { updated_at: timestamp };

      // Handle generator signature
      if (activeTab === 'generator' && generatorSigRef.current && !generatorSigRef.current.isEmpty() && generatorPrintName) {
        const sigDataUrl = generatorSigRef.current.toDataURL();
        const blob = dataURLtoBlob(sigDataUrl);
        const fileName = `generator_signature_${Date.now()}.png`;
        const uploadPath = `${dropoff.organization_id}/signatures/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('manifests')
          .upload(uploadPath, blob, { contentType: 'image/png', upsert: false });
        
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        
        updateData.generator_sig_path = uploadPath;
        updateData.generator_signed_by = generatorPrintName;
        updateData.generator_signed_at = timestamp;
      }

      // Handle hauler signature
      if (activeTab === 'hauler' && haulerSigRef.current && !haulerSigRef.current.isEmpty() && haulerPrintName) {
        const sigDataUrl = haulerSigRef.current.toDataURL();
        const blob = dataURLtoBlob(sigDataUrl);
        const fileName = `hauler_signature_${Date.now()}.png`;
        const uploadPath = `${dropoff.organization_id}/signatures/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('manifests')
          .upload(uploadPath, blob, { contentType: 'image/png', upsert: false });
        
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        
        updateData.hauler_sig_path = uploadPath;
        updateData.hauler_signed_by = haulerPrintName;
        updateData.hauler_signed_at = timestamp;
      }

      // Handle receiver signature
      if (activeTab === 'receiver' && receiverSigRef.current && !receiverSigRef.current.isEmpty() && receiverPrintName) {
        const sigDataUrl = receiverSigRef.current.toDataURL();
        const blob = dataURLtoBlob(sigDataUrl);
        const fileName = `receiver_signature_${Date.now()}.png`;
        const uploadPath = `${dropoff.organization_id}/signatures/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('manifests')
          .upload(uploadPath, blob, { contentType: 'image/png', upsert: false });
        
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        
        updateData.receiver_sig_path = uploadPath;
        updateData.receiver_signed_by = receiverPrintName;
        updateData.receiver_signed_at = timestamp;
      }

      // Update dropoff record
      const { error: updateError } = await supabase
        .from('dropoffs')
        .update(updateData)
        .eq('id', dropoff.id);
      
      if (updateError) throw new Error(`Update failed: ${updateError.message}`);

      // Regenerate manifest PDF if exists
      if (dropoff.manifest_id) {
        await generateManifest.mutateAsync(dropoff.id);
      }

      queryClient.invalidateQueries({ queryKey: ['dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['todays-dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      
      const sigType = activeTab === 'generator' ? 'Generator' : activeTab === 'hauler' ? 'Hauler' : 'Receiver';
      toast({
        title: "Signature Added",
        description: `${sigType} signature has been added successfully.`
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding signature:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add signature",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSignature = (type: 'generator' | 'hauler' | 'receiver') => {
    if (type === 'generator') {
      generatorSigRef.current?.clear();
    } else if (type === 'hauler') {
      haulerSigRef.current?.clear();
    } else {
      receiverSigRef.current?.clear();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="h-5 w-5" />
            Add Missing Signature
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generator" disabled={!needsGeneratorSig}>
              <Factory className="h-4 w-4 mr-1" />
              Gen {!needsGeneratorSig && '✓'}
            </TabsTrigger>
            <TabsTrigger value="hauler" disabled={!needsHaulerSig}>
              <Truck className="h-4 w-4 mr-1" />
              Hauler {!needsHaulerSig && '✓'}
            </TabsTrigger>
            <TabsTrigger value="receiver" disabled={!needsReceiverSig}>
              <Building2 className="h-4 w-4 mr-1" />
              Recv {!needsReceiverSig && '✓'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Generator is the source of the tires (tire shop, auto dealer, etc.)
            </p>
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
                <Button variant="ghost" size="sm" onClick={() => clearSignature('generator')}>
                  <Eraser className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="border-2 border-dashed border-border rounded-lg bg-background p-1">
                <SignatureCanvas
                  ref={(ref) => { generatorSigRef.current = ref; }}
                  canvasProps={{
                    className: "w-full h-32 rounded",
                    style: { width: '100%', height: '128px' }
                  }}
                  backgroundColor="white"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hauler" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Hauler is the person/company transporting the tires
            </p>
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
                <Button variant="ghost" size="sm" onClick={() => clearSignature('hauler')}>
                  <Eraser className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="border-2 border-dashed border-border rounded-lg bg-background p-1">
                <SignatureCanvas
                  ref={(ref) => { haulerSigRef.current = ref; }}
                  canvasProps={{
                    className: "w-full h-32 rounded",
                    style: { width: '100%', height: '128px' }
                  }}
                  backgroundColor="white"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="receiver" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Receiver is the BSG staff member accepting the tires
            </p>
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
              <Label>Receiver Selection (Optional)</Label>
              <Select value={selectedReceiverId} onValueChange={setSelectedReceiverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a receiver facility..." />
                </SelectTrigger>
                <SelectContent>
                  {receivers?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.receiver_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Print Name *</Label>
              <Input
                placeholder="Enter receiver staff name"
                value={receiverPrintName}
                onChange={(e) => {
                  setReceiverPrintName(e.target.value);
                  setSelectedEmployeeId("");
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Signature *</Label>
                <Button variant="ghost" size="sm" onClick={() => clearSignature('receiver')}>
                  <Eraser className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="border-2 border-dashed border-border rounded-lg bg-background p-1">
                <SignatureCanvas
                  ref={(ref) => { receiverSigRef.current = ref; }}
                  canvasProps={{
                    className: "w-full h-32 rounded",
                    style: { width: '100%', height: '128px' }
                  }}
                  backgroundColor="white"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Signature'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
