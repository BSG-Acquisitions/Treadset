import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/integrations/supabase/client";

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
  
  const queryClient = useQueryClient();

  const completeReceiverSignature = useMutation({
    mutationFn: async () => {
      if (!sigCanvas || sigCanvas.isEmpty()) {
        throw new Error("Please provide a signature");
      }

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

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      onOpenChange(false);
      setSigCanvas(null);
      setReceiverName("BSG Processor");
    },
    onError: (error: any) => {
      console.error("Failed to add receiver signature:", error);
    }
  });

  const clearSignature = () => {
    sigCanvas?.clear();
  };

  const handleSubmit = () => {
    completeReceiverSignature.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Complete Receiver Signature - Manifest {manifestNumber}</DialogTitle>
        </DialogHeader>
        
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

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={completeReceiverSignature.isPending}
            >
              {completeReceiverSignature.isPending ? "Adding Signature..." : "Complete Manifest"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};