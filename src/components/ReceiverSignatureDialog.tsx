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
import { useToast } from "@/hooks/use-toast";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useReceivers } from "@/hooks/useReceivers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReceiverSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manifestId: string;
  manifestNumber: string;
}

export const ReceiverSignatureDialog = ({ open, onOpenChange, manifestId, manifestNumber }: ReceiverSignatureDialogProps) => {
  const [sigCanvas, setSigCanvas] = useState<SignatureCanvas | null>(null);
  const [receiverName, setReceiverName] = useState("");
  const [printName, setPrintName] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionData, setCompletionData] = useState<{ pdfPath: string } | null>(null);
  
  const queryClient = useQueryClient();
  const { data: manifest } = useManifest(manifestId);
  const manifestIntegration = useManifestIntegration();
  const sendEmail = useSendManifestEmail();
  const { toast } = useToast();
  const { data: receivers } = useReceivers();
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>("");

  // Common print names for receiver signatures
  const printNameOptions = [
    "BSG Processor",
    "Facility Manager", 
    "Operations Manager",
    "Receiving Supervisor",
    "Plant Supervisor",
    "Quality Control",
    "Warehouse Manager"
  ];

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCompletionData(null);
      setSigCanvas(null);
      setReceiverName("");
      setPrintName("");
      setSelectedReceiverId("");
      setIsCompleting(false);
    }
    onOpenChange(newOpen);
  };

  const completeReceiverSignature = useMutation({
    mutationFn: async () => {
      if (!sigCanvas || sigCanvas.isEmpty()) {
        toast({ title: "Signature required", description: "Please provide a receiver signature.", variant: "destructive" });
        throw new Error("Please provide a signature");
      }

      if (!selectedReceiverId) {
        toast({ title: "Receiver required", description: "Please select a receiver.", variant: "destructive" });
        throw new Error("Please select a receiver");
      }

      if (!printName) {
        toast({ title: "Print name required", description: "Please enter or select a print name.", variant: "destructive" });
        throw new Error("Please provide a print name");
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

      // Get selected receiver data for manifest
      const selectedReceiver = receivers?.find(r => r.id === selectedReceiverId);

      // Update manifest with receiver signature info
      const { error: updateError } = await supabase
        .from('manifests')
        .update({
          receiver_sig_path: `signatures/${fileName}`,
          receiver_signed_at: timestamp,
          receiver_signed_by: printName,
          status: 'COMPLETED',
          updated_at: timestamp
        })
        .eq('id', manifestId);

      if (updateError) throw updateError;

      // Regenerate AcroForm PDF with receiver signature and data
      const overrides = {
        receiver_signature: `signatures/${fileName}`,
        receiver_print_name: printName,
        receiver_date: new Date(timestamp).toISOString().split('T')[0],
        receiver_time: new Date(timestamp).toLocaleTimeString('en-US', { hour12: false }),
        // Include selected receiver data
        receiver_name: selectedReceiver?.receiver_name || '',
        receiver_physical_address: selectedReceiver?.receiver_mailing_address || '',
        receiver_city: selectedReceiver?.receiver_city || '',
        receiver_state: selectedReceiver?.receiver_state || '',
        receiver_zip: selectedReceiver?.receiver_zip || '',
        receiver_phone: selectedReceiver?.receiver_phone || ''
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
      
      // Always attempt to send email after PDF generation (backend will resolve client email)
      if (result.pdfPath) {
        try {
          await sendEmail.mutateAsync({
            manifestId,
            pdfPath: result.pdfPath,
            subject: `Completed Manifest ${manifestNumber}`,
            messageHtml: `
              <h2>Manifest Completion Notice</h2>
              <p>Dear Customer,</p>
              <p>Your tire collection manifest <strong>${manifestNumber}</strong> has been completed with all required signatures.</p>
              <p>Please find the completed manifest attached.</p>
              <p>Best regards,<br>BSG Logistics</p>
            `
          });
          toast({ 
            title: "Email sent", 
            description: `Manifest email has been sent successfully.` 
          });
        } catch (emailError) {
          console.error('Failed to send completion email:', emailError);
          toast({ 
            title: "Email failed", 
            description: "Manifest completed but email could not be sent",
            variant: "destructive"
          });
        }
      }
    },
    onError: (error: any) => {
      console.error("Failed to add receiver signature:", error);
      toast({ title: "Completion failed", description: error?.message ?? "Unable to complete manifest.", variant: "destructive" });
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
              clientEmails={[]}
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
              <Label htmlFor="receiverSelect">Select Receiver</Label>
              <Select value={selectedReceiverId} onValueChange={(value) => {
                setSelectedReceiverId(value);
                const selected = receivers?.find(r => r.id === value);
                setReceiverName(selected?.receiver_name || "");
              }}>
                <SelectTrigger className="bg-background z-50">
                  <SelectValue placeholder="Choose a receiver..." />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {receivers?.map((receiver) => (
                    <SelectItem key={receiver.id} value={receiver.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{receiver.receiver_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {receiver.receiver_city}, {receiver.receiver_state}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="printNameSelect">Print Name for Signature</Label>
              <Select value={printName} onValueChange={setPrintName}>
                <SelectTrigger className="bg-background z-50">
                  <SelectValue placeholder="Choose or enter print name..." />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {printNameOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or enter custom print name"
                value={printName}
                onChange={(e) => setPrintName(e.target.value)}
                className="mt-2"
              />
            </div>

            {selectedReceiverId && (
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <h4 className="font-medium mb-2">Receiver Information:</h4>
                <div className="space-y-1 text-muted-foreground">
                  <p><strong>Name:</strong> {receivers?.find(r => r.id === selectedReceiverId)?.receiver_name}</p>
                  <p><strong>Address:</strong> {receivers?.find(r => r.id === selectedReceiverId)?.receiver_mailing_address}</p>
                  <p><strong>City:</strong> {receivers?.find(r => r.id === selectedReceiverId)?.receiver_city}, {receivers?.find(r => r.id === selectedReceiverId)?.receiver_state} {receivers?.find(r => r.id === selectedReceiverId)?.receiver_zip}</p>
                  <p><strong>Phone:</strong> {receivers?.find(r => r.id === selectedReceiverId)?.receiver_phone}</p>
                </div>
              </div>
            )}

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
                disabled={completeReceiverSignature.isPending || isCompleting || !selectedReceiverId || !printName}
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