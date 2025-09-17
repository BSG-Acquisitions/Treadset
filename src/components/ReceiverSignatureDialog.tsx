import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/integrations/supabase/client";
import { useManifestIntegration } from "@/hooks/useManifestIntegration";
import { useSendManifestEmail } from "@/hooks/useSendManifestEmail";
import { useManifest } from "@/hooks/useManifests";
import { ManifestPDFControls } from "@/components/ManifestPDFControls";
import { Mail, CheckCircle2 } from "lucide-react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ReceiverSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manifestId: string;
  manifestNumber: string;
}

export const ReceiverSignatureDialog = ({ open, onOpenChange, manifestId, manifestNumber }: ReceiverSignatureDialogProps) => {
  const [sigCanvas, setSigCanvas] = useState<SignatureCanvas | null>(null);
  const [receiverName, setReceiverName] = useState("BSG Processor");
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionData, setCompletionData] = useState<{ pdfPath: string } | null>(null);
  
  const queryClient = useQueryClient();
  const { data: manifest } = useManifest(manifestId);
  const manifestIntegration = useManifestIntegration();
  const sendEmail = useSendManifestEmail();

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCompletionData(null);
      setSigCanvas(null);
      setReceiverName("BSG Processor");
      setIsCompleting(false);
    }
    onOpenChange(newOpen);
  };

  const completeReceiverSignature = useMutation({
    mutationFn: async () => {
      if (!sigCanvas || sigCanvas.isEmpty()) {
        throw new Error("Please provide a signature");
      }

      setIsCompleting(true);
      const signatureDataURL = sigCanvas.toDataURL();
      const timestamp = new Date().toISOString();
      
      // Convert signature to PNG blob
      const response = await fetch(signatureDataURL);
      const blob = await response.blob();
      
      // Upload signature to storage
      const fileName = `receiver_signature_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('manifests')
        .upload(`signatures/${fileName}`, blob);

      if (uploadError) throw uploadError;

      // Update manifest with receiver signature info
      const { error: updateError } = await supabase
        .from('manifests')
        .update({
          receiver_sig_path: `signatures/${fileName}`,
          receiver_signed_at: timestamp,
          receiver_signed_by: receiverName,
          status: 'COMPLETED',
          updated_at: timestamp
        })
        .eq('id', manifestId);

      if (updateError) throw updateError;

      // Regenerate AcroForm PDF with receiver signature
      const overrides = {
        receiver_signature: `signatures/${fileName}`,
        receiver_print_name: receiverName,
        receiver_date: new Date(timestamp).toISOString().split('T')[0],
        receiver_time: new Date(timestamp).toLocaleTimeString('en-US', { hour12: false })
      };

      const pdfResult = await manifestIntegration.mutateAsync({ 
        manifestId, 
        overrides 
      });

      return { success: true, pdfPath: pdfResult.pdfPath };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      
      // Set completion data to show success view
      setCompletionData({ pdfPath: result.pdfPath });
      setIsCompleting(false);
      
      // Auto-send email if client has email
      if (manifest?.client?.company_name && result.pdfPath) {
        try {
          await sendEmail.mutateAsync({
            manifestId,
            subject: `Completed Manifest ${manifestNumber}`,
            messageHtml: `
              <h2>Manifest Completion Notice</h2>
              <p>Dear ${manifest.client.company_name},</p>
              <p>Your tire collection manifest <strong>${manifestNumber}</strong> has been completed with all required signatures.</p>
              <p>Please find the completed manifest attached.</p>
              <p>Best regards,<br>BSG Logistics</p>
            `
          });
        } catch (emailError) {
          console.error('Failed to send completion email:', emailError);
        }
      }
    },
    onError: (error: any) => {
      console.error("Failed to add receiver signature:", error);
      setIsCompleting(false);
    }
  });

  const clearSignature = () => {
    sigCanvas?.clear();
  };

  const handleSubmit = () => {
    completeReceiverSignature.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {completionData ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Manifest {manifestNumber} - Completed!
              </div>
            ) : (
              `Complete Receiver Signature - Manifest ${manifestNumber}`
            )}
          </DialogTitle>
        </DialogHeader>
        
        {completionData ? (
          /* Success View with PDF Controls */
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Manifest Successfully Completed!</span>
              </div>
              <p className="text-sm text-green-600">
                The manifest has been completed with all required signatures and is ready for viewing or download.
                {manifest?.client?.company_name && ` A completion notice has been sent to ${manifest.client.company_name}.`}
              </p>
            </div>
            
            <ManifestPDFControls
              manifestId={manifestId}
              acroformPdfPath={completionData.pdfPath}
              clientEmails={manifest?.client?.company_name ? [manifest.client.company_name] : []}
              className="mt-4"
            />
            
            <div className="flex justify-end">
              <Button onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          /* Signature Form */
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="receiverName">Receiver Name</Label>
              <Input
                id="receiverName"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="Enter receiver name"
              />
            </div>

            <div className="space-y-2">
              <Label>Receiver Signature</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <SignatureCanvas
                  ref={(ref) => setSigCanvas(ref)}
                  penColor="black"
                  canvasProps={{
                    width: 500,
                    height: 200,
                    className: 'signature-canvas w-full h-48 border rounded'
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearSignature} size="sm">
                  Clear Signature
                </Button>
              </div>
            </div>

            {/* If a PDF already exists (e.g., from a previous attempt), show controls here too */}
            {manifest?.acroform_pdf_path && (
              <div className="pt-2">
                <ManifestPDFControls
                  manifestId={manifestId}
                  acroformPdfPath={manifest.acroform_pdf_path}
                  clientEmails={[]}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isCompleting}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={completeReceiverSignature.isPending || isCompleting}
                className="min-w-[160px]"
              >
                {isCompleting ? (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 animate-spin" />
                    Completing...
                  </div>
                ) : (
                  "Complete & Email"
                )}
              </Button>
            </div>
            
            {manifest?.client?.company_name && !completionData && (
              <div className="text-sm text-muted-foreground">
                Completion notice will be emailed to: {manifest.client.company_name}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};