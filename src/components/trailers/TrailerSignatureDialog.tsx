import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eraser } from "lucide-react";

interface TrailerSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType: string;
  trailerNumber: string;
  locationName: string;
  onComplete: (signaturePath: string | null, notes: string) => Promise<void>;
}

export function TrailerSignatureDialog({
  open,
  onOpenChange,
  eventType,
  trailerNumber,
  locationName,
  onComplete,
}: TrailerSignatureDialogProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [signerName, setSignerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearSignature = () => {
    sigRef.current?.clear();
  };

  const handleSubmit = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Please provide a signature");
      return;
    }

    if (!signerName.trim()) {
      toast.error("Please enter signer name");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get signature data
      const signatureDataUrl = sigRef.current.toDataURL("image/png");
      
      // Convert to blob
      const res = await fetch(signatureDataUrl);
      const blob = await res.blob();
      
      // Generate filename
      const timestamp = Date.now();
      const fileName = `trailer_sig_${eventType}_${timestamp}.png`;
      const filePath = `trailer-signatures/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('manifests')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Continue without signature if upload fails
        await onComplete(null, `${signerName}: ${notes}`);
      } else {
        await onComplete(filePath, `${signerName}: ${notes}`);
      }

      // Reset form
      setSignerName("");
      setNotes("");
      sigRef.current?.clear();
      onOpenChange(false);
    } catch (error) {
      console.error('Signature error:', error);
      toast.error("Failed to save signature");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEventTitle = () => {
    switch (eventType) {
      case 'pickup_full':
        return 'Confirm Full Trailer Pickup';
      case 'drop_full':
        return 'Confirm Full Trailer Drop-off';
      default:
        return 'Confirm Trailer Event';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getEventTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <div className="text-sm font-medium">Trailer: {trailerNumber}</div>
            <div className="text-sm text-muted-foreground">Location: {locationName}</div>
          </div>

          <div>
            <Label>Signer Name</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Enter name of person signing"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Signature</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSignature}
              >
                <Eraser className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="border rounded-lg bg-white">
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  className: "w-full h-32",
                  style: { width: '100%', height: '128px' }
                }}
                backgroundColor="white"
              />
            </div>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Complete Event'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
