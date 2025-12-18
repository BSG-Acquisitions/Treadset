import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useGenerateDropoffManifest } from "@/hooks/useGenerateDropoffManifest";
import { Loader2, Pen, Factory, Truck, Building2 } from "lucide-react";
import { DropoffSignatureStep } from "./DropoffSignatureStep";
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
  const [generatorSigDataUrl, setGeneratorSigDataUrl] = useState<string | null>(null);
  const [haulerSigDataUrl, setHaulerSigDataUrl] = useState<string | null>(null);
  const [receiverSigDataUrl, setReceiverSigDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const generateManifest = useGenerateDropoffManifest();

  const needsGeneratorSig = !(dropoff as any).generator_sig_path;
  const needsHaulerSig = !dropoff.hauler_sig_path;
  const needsReceiverSig = !dropoff.receiver_sig_path;

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
      if (activeTab === 'generator' && generatorSigDataUrl && generatorPrintName) {
        const blob = dataURLtoBlob(generatorSigDataUrl);
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
      if (activeTab === 'hauler' && haulerSigDataUrl && haulerPrintName) {
        const blob = dataURLtoBlob(haulerSigDataUrl);
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
      if (activeTab === 'receiver' && receiverSigDataUrl && receiverPrintName) {
        const blob = dataURLtoBlob(receiverSigDataUrl);
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

          <TabsContent value="generator" className="mt-4">
            <DropoffSignatureStep
              title="Generator Signature"
              description="Generator is the source of the tires (tire shop, auto dealer, etc.)"
              signatureDataUrl={generatorSigDataUrl}
              printName={generatorPrintName}
              onSignatureChange={setGeneratorSigDataUrl}
              onPrintNameChange={setGeneratorPrintName}
              showEmployeeSelect={false}
            />
          </TabsContent>

          <TabsContent value="hauler" className="mt-4">
            <DropoffSignatureStep
              title="Hauler Signature"
              description="Hauler is the person/company transporting the tires"
              signatureDataUrl={haulerSigDataUrl}
              printName={haulerPrintName}
              onSignatureChange={setHaulerSigDataUrl}
              onPrintNameChange={setHaulerPrintName}
              showEmployeeSelect={false}
            />
          </TabsContent>

          <TabsContent value="receiver" className="mt-4">
            <DropoffSignatureStep
              title="Receiver Signature"
              description="BSG staff member receiving the tires"
              signatureDataUrl={receiverSigDataUrl}
              printName={receiverPrintName}
              onSignatureChange={setReceiverSigDataUrl}
              onPrintNameChange={setReceiverPrintName}
              showEmployeeSelect={true}
            />
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
