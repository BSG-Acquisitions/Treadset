import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eraser, Mail } from "lucide-react";

interface TrailerSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType: string;
  trailerNumber: string;
  locationName: string;
  onComplete: (signaturePath: string | null, notes: string, contactInfo?: { email?: string; name?: string }) => Promise<void>;
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
  const [contactEmail, setContactEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearSignature = () => {
    sigRef.current?.clear();
  };

  const resetForm = () => {
    setSignerName("");
    setNotes("");
    setContactEmail("");
    setSendEmail(false);
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

    if (sendEmail && !contactEmail.trim()) {
      toast.error("Please enter contact email to send manifest");
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

      const contactInfo = sendEmail ? {
        email: contactEmail.trim(),
        name: signerName.trim(),
      } : undefined;

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Continue without signature if upload fails
        await onComplete(null, `${signerName}: ${notes}`, contactInfo);
      } else {
        await onComplete(filePath, `${signerName}: ${notes}`, contactInfo);
      }

      // Reset form
      resetForm();
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
      case 'pickup_empty':
        return 'Confirm Empty Trailer Pickup';
      case 'drop_empty':
        return 'Confirm Empty Trailer Drop-off';
      case 'swap':
        return 'Confirm Trailer Swap';
      default:
        return 'Confirm Trailer Event';
    }
  };

  const requiresManifest = ['pickup_full', 'drop_full'].includes(eventType);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }}>
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
            <Label>Signer Name *</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Enter name of person signing"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Signature *</Label>
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

          {requiresManifest && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked === true)}
                />
                <label
                  htmlFor="sendEmail"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                >
                  <Mail className="h-4 w-4" />
                  Email manifest to location contact
                </label>
              </div>

              {sendEmail && (
                <div>
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@location.com"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} disabled={isSubmitting}>
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