import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useManifestIntegration } from "@/hooks/useManifestIntegration";
import { Loader2, FileEdit, Factory, Truck, Building2, Trash2 } from "lucide-react";
import { DropoffSignatureStep } from "./DropoffSignatureStep";
import type { Database } from "@/integrations/supabase/types";

type Dropoff = Database["public"]["Tables"]["dropoffs"]["Row"] & {
  clients?: {
    company_name?: string | null;
    contact_name?: string | null;
    phone?: string | null;
    mailing_address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    physical_address?: string | null;
    physical_city?: string | null;
    physical_state?: string | null;
    physical_zip?: string | null;
    county?: string | null;
  } | null;
  haulers?: {
    hauler_name?: string | null;
  } | null;
};

interface EditManifestSignaturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropoff: Dropoff;
}

export const EditManifestSignaturesDialog = ({ open, onOpenChange, dropoff }: EditManifestSignaturesDialogProps) => {
  const [generatorPrintName, setGeneratorPrintName] = useState("");
  const [haulerPrintName, setHaulerPrintName] = useState("");
  const [receiverPrintName, setReceiverPrintName] = useState("");
  const [generatorSigDataUrl, setGeneratorSigDataUrl] = useState<string | null>(null);
  const [haulerSigDataUrl, setHaulerSigDataUrl] = useState<string | null>(null);
  const [receiverSigDataUrl, setReceiverSigDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keepExistingGenerator, setKeepExistingGenerator] = useState(true);
  const [keepExistingHauler, setKeepExistingHauler] = useState(true);
  const [keepExistingReceiver, setKeepExistingReceiver] = useState(true);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const manifestIntegration = useManifestIntegration();

  // Pre-fill with existing data when dialog opens
  useEffect(() => {
    if (open) {
      setGeneratorPrintName((dropoff as any).generator_signed_by || "");
      setHaulerPrintName(dropoff.hauler_signed_by || "");
      setReceiverPrintName(dropoff.receiver_signed_by || "");
      setGeneratorSigDataUrl(null);
      setHaulerSigDataUrl(null);
      setReceiverSigDataUrl(null);
      setKeepExistingGenerator(!!(dropoff as any).generator_sig_path);
      setKeepExistingHauler(!!dropoff.hauler_sig_path);
      setKeepExistingReceiver(!!dropoff.receiver_sig_path);
    }
  }, [open, dropoff]);

  const hasExistingGenerator = !!(dropoff as any).generator_sig_path;
  const hasExistingHauler = !!dropoff.hauler_sig_path;
  const hasExistingReceiver = !!dropoff.receiver_sig_path;

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
      if (!keepExistingGenerator && generatorSigDataUrl && generatorPrintName) {
        const blob = dataURLtoBlob(generatorSigDataUrl);
        const fileName = `generator_signature_${Date.now()}.png`;
        const uploadPath = `${dropoff.organization_id}/signatures/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('manifests')
          .upload(uploadPath, blob, { contentType: 'image/png', upsert: false });
        
        if (uploadError) throw new Error(`Generator upload failed: ${uploadError.message}`);
        
        updateData.generator_sig_path = uploadPath;
        updateData.generator_signed_by = generatorPrintName;
        updateData.generator_signed_at = timestamp;
      } else if (keepExistingGenerator && generatorPrintName !== (dropoff as any).generator_signed_by) {
        // Just update print name if changed
        updateData.generator_signed_by = generatorPrintName;
      }

      // Handle hauler signature
      if (!keepExistingHauler && haulerSigDataUrl && haulerPrintName) {
        const blob = dataURLtoBlob(haulerSigDataUrl);
        const fileName = `hauler_signature_${Date.now()}.png`;
        const uploadPath = `${dropoff.organization_id}/signatures/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('manifests')
          .upload(uploadPath, blob, { contentType: 'image/png', upsert: false });
        
        if (uploadError) throw new Error(`Hauler upload failed: ${uploadError.message}`);
        
        updateData.hauler_sig_path = uploadPath;
        updateData.hauler_signed_by = haulerPrintName;
        updateData.hauler_signed_at = timestamp;
      } else if (keepExistingHauler && haulerPrintName !== dropoff.hauler_signed_by) {
        // Just update print name if changed
        updateData.hauler_signed_by = haulerPrintName;
      }

      // Handle receiver signature
      if (!keepExistingReceiver && receiverSigDataUrl && receiverPrintName) {
        const blob = dataURLtoBlob(receiverSigDataUrl);
        const fileName = `receiver_signature_${Date.now()}.png`;
        const uploadPath = `${dropoff.organization_id}/signatures/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('manifests')
          .upload(uploadPath, blob, { contentType: 'image/png', upsert: false });
        
        if (uploadError) throw new Error(`Receiver upload failed: ${uploadError.message}`);
        
        updateData.receiver_sig_path = uploadPath;
        updateData.receiver_signed_by = receiverPrintName;
        updateData.receiver_signed_at = timestamp;
      } else if (keepExistingReceiver && receiverPrintName !== dropoff.receiver_signed_by) {
        // Just update print name if changed
        updateData.receiver_signed_by = receiverPrintName;
      }

      // Update dropoff record first
      const { error: updateError } = await supabase
        .from('dropoffs')
        .update(updateData)
        .eq('id', dropoff.id);
      
      if (updateError) throw new Error(`Update failed: ${updateError.message}`);

      // Delete old manifest PDF if exists
      if (dropoff.manifest_pdf_path) {
        await supabase.storage
          .from('manifests')
          .remove([dropoff.manifest_pdf_path]);
      }

      // Regenerate manifest PDF with corrected data
      if (dropoff.manifest_id) {
        // Build overrides from the updated data
        const overrides: Record<string, any> = {};
        
        // Use new values or existing
        if (updateData.generator_sig_path) {
          overrides.generator_signature = updateData.generator_sig_path;
        } else if ((dropoff as any).generator_sig_path) {
          overrides.generator_signature = (dropoff as any).generator_sig_path;
        }
        overrides.generator_print_name = updateData.generator_signed_by || (dropoff as any).generator_signed_by || '';
        
        if (updateData.hauler_sig_path) {
          overrides.hauler_signature = updateData.hauler_sig_path;
        } else if (dropoff.hauler_sig_path) {
          overrides.hauler_signature = dropoff.hauler_sig_path;
        }
        overrides.hauler_print_name = updateData.hauler_signed_by || dropoff.hauler_signed_by || '';
        
        if (updateData.receiver_sig_path) {
          overrides.receiver_signature = updateData.receiver_sig_path;
        } else if (dropoff.receiver_sig_path) {
          overrides.receiver_signature = dropoff.receiver_sig_path;
        }
        overrides.receiver_print_name = updateData.receiver_signed_by || dropoff.receiver_signed_by || '';

        // Include generator info from the dropoff's client
        if (dropoff.clients) {
          overrides.generator_name = dropoff.clients.company_name || dropoff.clients.contact_name || '';
          overrides.generator_phone = dropoff.clients.phone || '';
          overrides.generator_mail_address = dropoff.clients.mailing_address || '';
          overrides.generator_city = dropoff.clients.city || '';
          overrides.generator_state = dropoff.clients.state || '';
          overrides.generator_zip = dropoff.clients.zip || '';
          overrides.generator_physical_address = dropoff.clients.physical_address || dropoff.clients.mailing_address || '';
          overrides.generator_physical_city = dropoff.clients.physical_city || dropoff.clients.city || '';
          overrides.generator_physical_state = dropoff.clients.physical_state || dropoff.clients.state || '';
          overrides.generator_physical_zip = dropoff.clients.physical_zip || dropoff.clients.zip || '';
          overrides.generator_county = dropoff.clients.county || '';
        }

        const pdfResult = await manifestIntegration.mutateAsync({
          manifestId: dropoff.manifest_id,
          overrides,
        });

        // Update dropoff with new manifest_pdf_path
        await supabase
          .from('dropoffs')
          .update({ manifest_pdf_path: pdfResult.pdfPath })
          .eq('id', dropoff.id);
      }

      queryClient.invalidateQueries({ queryKey: ['dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['todays-dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      
      toast({
        title: "Manifest Updated",
        description: "The manifest has been corrected and regenerated successfully."
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating manifest:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update manifest",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Edit Manifest Signatures
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Generator Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Generator Signature</h3>
                {hasExistingGenerator && keepExistingGenerator && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Signed</span>
                )}
              </div>
              {hasExistingGenerator && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setKeepExistingGenerator(!keepExistingGenerator)}
                  className="text-xs"
                >
                  {keepExistingGenerator ? (
                    <>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Replace Signature
                    </>
                  ) : (
                    "Keep Existing"
                  )}
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Print Name</Label>
              <Input
                value={generatorPrintName}
                onChange={(e) => setGeneratorPrintName(e.target.value)}
                placeholder="Enter generator name"
              />
            </div>
            
            {(!hasExistingGenerator || !keepExistingGenerator) && (
              <DropoffSignatureStep
                title=""
                description="Draw or type the generator signature below"
                signatureDataUrl={generatorSigDataUrl}
                printName={generatorPrintName}
                onSignatureChange={setGeneratorSigDataUrl}
                onPrintNameChange={setGeneratorPrintName}
                showEmployeeSelect={false}
                hidePrintName
              />
            )}
          </div>

          {/* Hauler Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Hauler Signature</h3>
                {hasExistingHauler && keepExistingHauler && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Signed</span>
                )}
              </div>
              {hasExistingHauler && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setKeepExistingHauler(!keepExistingHauler)}
                  className="text-xs"
                >
                  {keepExistingHauler ? (
                    <>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Replace Signature
                    </>
                  ) : (
                    "Keep Existing"
                  )}
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Print Name</Label>
              <Input
                value={haulerPrintName}
                onChange={(e) => setHaulerPrintName(e.target.value)}
                placeholder="Enter hauler name"
              />
            </div>
            
            {(!hasExistingHauler || !keepExistingHauler) && (
              <DropoffSignatureStep
                title=""
                description="Draw or type the hauler signature below"
                signatureDataUrl={haulerSigDataUrl}
                printName={haulerPrintName}
                onSignatureChange={setHaulerSigDataUrl}
                onPrintNameChange={setHaulerPrintName}
                showEmployeeSelect={false}
                hidePrintName
              />
            )}
          </div>

          {/* Receiver Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Receiver Signature</h3>
                {hasExistingReceiver && keepExistingReceiver && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Signed</span>
                )}
              </div>
              {hasExistingReceiver && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setKeepExistingReceiver(!keepExistingReceiver)}
                  className="text-xs"
                >
                  {keepExistingReceiver ? (
                    <>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Replace Signature
                    </>
                  ) : (
                    "Keep Existing"
                  )}
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Print Name</Label>
              <Input
                value={receiverPrintName}
                onChange={(e) => setReceiverPrintName(e.target.value)}
                placeholder="Enter receiver name"
              />
            </div>
            
            {(!hasExistingReceiver || !keepExistingReceiver) && (
              <DropoffSignatureStep
                title=""
                description="Draw or type the receiver signature below"
                signatureDataUrl={receiverSigDataUrl}
                printName={receiverPrintName}
                onSignatureChange={setReceiverSigDataUrl}
                onPrintNameChange={setReceiverPrintName}
                showEmployeeSelect={true}
                hidePrintName
              />
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving & Regenerating...
              </>
            ) : (
              'Save & Regenerate Manifest'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
