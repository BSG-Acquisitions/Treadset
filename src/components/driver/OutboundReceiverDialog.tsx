import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Building2, Package, MapPin, Truck } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompleteOutboundManifest, OutboundManifestWithRelations } from '@/hooks/useOutboundManifests';
import { useManifestIntegration } from '@/hooks/useManifestIntegration';
import { useCreateShipmentFromManifest } from '@/hooks/useCreateShipmentFromManifest';

interface OutboundReceiverDialogProps {
  manifest: OutboundManifestWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const OutboundReceiverDialog: React.FC<OutboundReceiverDialogProps> = ({
  manifest,
  open,
  onOpenChange,
  onComplete,
}) => {
  const [receiverName, setReceiverName] = useState('');
  const [sigDataUrl, setSigDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const sigRef = useRef<SignatureCanvas>(null);
  const { toast } = useToast();
  
  const completeManifest = useCompleteOutboundManifest();
  const manifestIntegration = useManifestIntegration();
  const createShipment = useCreateShipmentFromManifest();

  const blurActiveInputs = () => {
    const ae = document.activeElement as HTMLElement | null;
    if (ae && typeof ae.blur === 'function') {
      ae.blur();
    }
  };

  const handleSignatureEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.toDataURL();
      setSigDataUrl(dataUrl);
    }
  };

  const handleComplete = async () => {
    if (!manifest) return;
    
    if (!receiverName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter the receiver's name.",
        variant: "destructive",
      });
      return;
    }

    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast({
        title: "Signature Required",
        description: "Please provide the receiver's signature.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Save signature to storage
      const canvas = sigRef.current.getTrimmedCanvas();
      const blob = await new Promise<Blob>((resolve) => 
        canvas.toBlob(resolve as BlobCallback, 'image/png')
      );
      
      const fileName = `signatures/${manifest.id}/receiver.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('manifests')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw uploadError;

      // Complete the manifest with receiver signature
      await completeManifest.mutateAsync({
        manifestId: manifest.id,
        receiverSigPath: fileName,
        receiverName: receiverName.trim(),
      });

      // Regenerate PDF with all three signatures
      const currentDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });

      await manifestIntegration.mutateAsync({
        manifestId: manifest.id,
        overrides: {
          receiver_date: currentDate,
          receiver_time: currentTime,
        }
      });

      // Auto-create shipment record for state reporting
      await createShipment.mutateAsync({
        manifestId: manifest.id,
        originEntityId: manifest.origin_entity_id!,
        destinationEntityId: manifest.destination_entity_id!,
        materialForm: manifest.material_form as any,
        quantityPte: manifest.total_pte || 0,
        departedAt: manifest.created_at,
        arrivedAt: new Date().toISOString(),
      });

      toast({
        title: "Delivery Completed",
        description: "Manifest completed with receiver signature. Shipment record created.",
      });

      onComplete();
    } catch (error: any) {
      console.error("Error completing manifest:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete manifest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReceiverName('');
    setSigDataUrl('');
    sigRef.current?.clear();
    onOpenChange(false);
  };

  if (!manifest) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Complete Delivery
          </DialogTitle>
          <DialogDescription>
            Manifest {manifest.manifest_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Manifest Summary */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="text-sm font-medium">{manifest.origin_entity?.legal_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="text-sm font-medium">{manifest.destination_entity?.legal_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Material</p>
                  <p className="text-sm font-medium">
                    {manifest.material_form} - {manifest.total_pte?.toLocaleString()} PTE
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signature Status */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Generator signed</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Hauler signed</span>
            </div>
          </div>

          {/* Receiver Signature */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Receiver Signature</Label>
            
            <div>
              <Label htmlFor="receiverName" className="text-sm">Print Name</Label>
              <Input
                id="receiverName"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder={`${manifest.destination_entity?.legal_name} representative`}
                className="h-10"
              />
            </div>

            <div 
              className="border-2 border-dashed border-muted-foreground/25 p-2 rounded-lg"
              onTouchStart={(e) => { blurActiveInputs(); e.stopPropagation(); }}
              onPointerDown={() => blurActiveInputs()}
            >
              <SignatureCanvas
                ref={sigRef}
                onEnd={handleSignatureEnd}
                canvasProps={{
                  className: 'w-full h-32 border border-border rounded touch-none bg-white',
                  style: { 
                    touchAction: 'none', 
                    width: '100%', 
                    height: '128px',
                  }
                }}
              />
            </div>

            <Button 
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                sigRef.current?.clear();
                setSigDataUrl('');
              }}
              className="w-full"
            >
              Clear Signature
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleComplete}
              disabled={loading || !receiverName.trim() || !sigDataUrl}
              className="flex-1"
            >
              {loading ? 'Completing...' : 'Complete Manifest'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
