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
import { createPrintNameWithTimestamp } from "@/lib/manifestTimestamps";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useReceivers } from "@/hooks/useReceivers";
import { useEmployees } from "@/hooks/useEmployees";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReceiverSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manifestId: string;
  manifestNumber: string;
}

export const ReceiverSignatureDialog = ({ open, onOpenChange, manifestId, manifestNumber }: ReceiverSignatureDialogProps) => {
  const [sigCanvas, setSigCanvas] = useState<SignatureCanvas | null>(null);
  const [printName, setPrintName] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionData, setCompletionData] = useState<{ pdfPath: string } | null>(null);
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  
  const queryClient = useQueryClient();
  const { data: manifest } = useManifest(manifestId);
  const manifestIntegration = useManifestIntegration();
  const sendEmail = useSendManifestEmail();
  const { toast } = useToast();
  const { data: receivers } = useReceivers();
  const { data: employees } = useEmployees();
  const displayManifestNumber = manifestNumber || manifest?.manifest_number || manifestId;

  // Get selected receiver data
  const selectedReceiver = receivers?.find(r => r.id === selectedReceiverId);

  // Get selected employee data
  const selectedEmployee = employees?.find(emp => emp.id === selectedEmployeeId);

  // Get print name options from active employees
  const printNameOptions = employees
    ?.filter(emp => emp.isActive)
    ?.map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      signatureDataUrl: emp.signatureDataUrl
    }))
    ?.filter(opt => opt.name.length > 0) || [];

  // Load saved signature when employee is selected
  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const employee = employees?.find(emp => emp.id === employeeId);
    if (employee) {
      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      setPrintName(fullName);
      
      // Load saved signature if it exists
      if (employee.signatureDataUrl && sigCanvas) {
        sigCanvas.fromDataURL(employee.signatureDataUrl);
      }
    }
  };

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCompletionData(null);
      setSigCanvas(null);
      setPrintName("");
      setSelectedReceiverId("");
      setSelectedEmployeeId("");
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
      
      // Save signature to employee record if an employee is selected
      if (selectedEmployeeId && selectedEmployee) {
        try {
          await supabase
            .from('users')
            .update({ signature_data_url: signatureDataURL })
            .eq('id', selectedEmployeeId);
        } catch (error) {
          console.error('Failed to save signature to employee record:', error);
        }
      }
      
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
      if (!selectedReceiver) {
        throw new Error("Selected receiver not found");
      }

      // Update manifest with receiver signature info
      // Guard: Only allow COMPLETED status when receiver signature is being added
      const updateData: any = {
        receiver_sig_path: `signatures/${fileName}`,
        receiver_signed_at: timestamp,
        receiver_signed_by: printName,
        status: 'COMPLETED', // Safe to set COMPLETED here because we have all signature data
        updated_at: timestamp
      };

      const { error: updateError } = await supabase
        .from('manifests')
        .update(updateData)
        .eq('id', manifestId);

      if (updateError) throw updateError;

      // Regenerate AcroForm PDF with receiver signature and data
      const manifestData = manifest as any;
      const overrides: Record<string, any> = {
        receiver_signature: `signatures/${fileName}`,
        receiver_print_name: createPrintNameWithTimestamp(printName, timestamp, 'Processor Representative'),
        receiver_date: new Date(timestamp).toISOString().split('T')[0],
        receiver_time: new Date(timestamp).toLocaleTimeString('en-US', { hour12: false }),
        // Include selected receiver data
        receiver_name: selectedReceiver.receiver_name || '',
        receiver_physical_address: selectedReceiver.receiver_mailing_address || '',
        receiver_city: selectedReceiver.receiver_city || '',
        receiver_state: selectedReceiver.receiver_state || '',
        receiver_zip: selectedReceiver.receiver_zip || '',
        receiver_phone: selectedReceiver.receiver_phone || '',
        receiver_mi_reg: selectedReceiver.collection_site_reg || ''
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
            subject: `Completed Manifest ${displayManifestNumber}`,
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
                  Manifest {displayManifestNumber} - Completed!
                </div>
              ) : (
                `Complete Receiver Signature - Manifest ${displayManifestNumber}`
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiverSelect">Select Receiver</Label>
                <Select 
                  value={selectedReceiverId} 
                  onValueChange={setSelectedReceiverId}
                >
                  <SelectTrigger className="bg-background border border-input">
                    <SelectValue placeholder="Choose a receiver..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-input shadow-lg z-[100]">
                    {receivers?.map((receiver) => (
                      <SelectItem key={receiver.id} value={receiver.id}>
                        <div className="flex flex-col py-1">
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
                <Select value={selectedEmployeeId} onValueChange={handleEmployeeSelect}>
                  <SelectTrigger className="bg-background border border-input">
                    <SelectValue placeholder="Choose an employee or enter custom name..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-input shadow-lg z-[100]">
                    {printNameOptions.length > 0 ? (
                      printNameOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          <div className="flex items-center gap-2">
                            {opt.name}
                            {opt.signatureDataUrl && (
                              <span className="text-xs text-muted-foreground">(saved signature)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No employees found. Enter a custom name below.
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or enter custom print name"
                  value={printName}
                  onChange={(e) => {
                    setPrintName(e.target.value);
                    setSelectedEmployeeId(""); // Clear employee selection if custom name entered
                  }}
                  className="bg-background"
                />
              </div>

              {selectedReceiver && (
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <h4 className="font-medium mb-3 text-sm">Receiver Information:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Name:</span>
                      <p className="mt-1">{selectedReceiver.receiver_name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Phone:</span>
                      <p className="mt-1">{selectedReceiver.receiver_phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">MI Site Reg #:</span>
                      <p className="mt-1">{selectedReceiver.collection_site_reg || 'Not provided'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-medium text-muted-foreground">Address:</span>
                      <p className="mt-1">
                        {selectedReceiver.receiver_mailing_address}<br />
                        {selectedReceiver.receiver_city}, {selectedReceiver.receiver_state} {selectedReceiver.receiver_zip}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label>Receiver Signature</Label>
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 bg-muted/10">
                  <SignatureCanvas
                    ref={(ref) => setSigCanvas(ref)}
                    penColor="black"
                    canvasProps={{
                      width: 500,
                      height: 200,
                      className: 'signature-canvas w-full h-48 border border-border rounded bg-background'
                    }}
                  />
                </div>
                <Button variant="outline" onClick={clearSignature} size="sm" className="w-fit">
                  Clear Signature
                </Button>
              </div>

              {/* Existing PDF Preview */}
              {manifest?.acroform_pdf_path && (
                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium mb-3 text-sm">Current Manifest</h4>
                  <ManifestPDFControls
                    manifestId={manifestId}
                    acroformPdfPath={manifest.acroform_pdf_path}
                    clientEmails={[]}
                  />
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => handleOpenChange(false)} 
                  disabled={isCompleting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={completeReceiverSignature.isPending || isCompleting || !selectedReceiverId || !printName}
                  className="min-w-[160px] w-full sm:w-auto"
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
                <div className="text-sm text-muted-foreground text-center pt-2">
                  📧 Completion notice will be emailed to: {manifest.client.company_name}
                </div>
              )}
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
};