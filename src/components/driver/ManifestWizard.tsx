import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Camera, CheckCircle, Clock, FileText, PenTool } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useManifestIntegration } from '@/hooks/useManifestIntegration';
import { AcroFormLivePreview } from '@/components/manifest/AcroFormLivePreview';

interface ManifestWizardProps {
  manifestId: string;
  onComplete: () => void;
}

type WizardStep = 'arrive' | 'counts' | 'photos' | 'signatures' | 'review';

export const ManifestWizard: React.FC<ManifestWizardProps> = ({ manifestId, onComplete }) => {
  const [step, setStep] = useState<WizardStep>('arrive');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const manifestIntegration = useManifestIntegration();
  const customerSigRef = useRef<SignatureCanvas>(null);
  const driverSigRef = useRef<SignatureCanvas>(null);
  
  const [data, setData] = useState({
    arriveTime: '',
    pteOff: 0,
    pteOn: 0,
    c175Off: 0,
    c175On: 0,
    c225Off: 0,
    c225On: 0,
    notes: '',
    photos: [] as File[],
    customerSigned: false,
    driverSigned: false,
    customerSigPath: '',
    driverSigPath: ''
  });

  const steps: Array<{ key: WizardStep; title: string; icon: React.ReactNode }> = [
    { key: 'arrive', title: 'Arrive', icon: <Clock className="h-4 w-4" /> },
    { key: 'counts', title: 'Counts', icon: <FileText className="h-4 w-4" /> },
    { key: 'photos', title: 'Photos', icon: <Camera className="h-4 w-4" /> },
    { key: 'signatures', title: 'Signatures', icon: <PenTool className="h-4 w-4" /> },
    { key: 'review', title: 'Review', icon: <CheckCircle className="h-4 w-4" /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].key);
    }
  };

  const saveSignature = async (type: 'customer' | 'driver', sigRef: React.RefObject<SignatureCanvas>) => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast({ title: "Error", description: "Please provide a signature", variant: "destructive" });
      return false;
    }

    try {
      setLoading(true);
      const canvas = sigRef.current.getTrimmedCanvas();
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(resolve as BlobCallback, 'image/png'));
      
      const fileName = `signatures/${manifestId}/${type}.png`;
      const { error } = await supabase.storage
        .from('manifests')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      if (error) throw error;

      if (type === 'customer') {
        setData(prev => ({ ...prev, customerSigned: true, customerSigPath: fileName }));
      } else {
        setData(prev => ({ ...prev, driverSigned: true, driverSigPath: fileName }));
      }

      return true;
    } catch (error) {
      toast({ title: "Error", description: "Failed to save signature", variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!data.customerSigned || !data.driverSigned) {
      toast({ title: "Error", description: "Both signatures are required", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);

      // Update manifest with collected data
      const { error: updateError } = await supabase
        .from('manifests')
        .update({
          pte_off_rim: data.pteOff,
          pte_on_rim: data.pteOn,
          commercial_17_5_19_5_off: data.c175Off,
          commercial_17_5_19_5_on: data.c175On,
          commercial_22_5_off: data.c225Off,
          commercial_22_5_on: data.c225On,
          customer_signature_png_path: data.customerSigPath,
          driver_signature_png_path: data.driverSigPath,
          status: 'AWAITING_FINALIZATION'
        })
        .eq('id', manifestId);

      if (updateError) throw updateError;

      const payload = { manifest_id: manifestId };
      const queueKey = 'manifestFinalizeQueue';

      const execute = async () => {
        // Use the new integration hook that generates both PDFs
        const result = await manifestIntegration.mutateAsync({ manifestId });
        return result;
      };

      if (!navigator.onLine) {
        const queued = JSON.parse(localStorage.getItem(queueKey) || '[]');
        queued.push(payload);
        localStorage.setItem(queueKey, JSON.stringify(queued));
        toast({ title: "Queued", description: "Manifest will be finalized when online" });
        onComplete();
        return;
      }

      await execute();
      toast({ title: "Success", description: "Manifest finalized and sent to client" });
      onComplete();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const queueKey = 'manifestFinalizeQueue';
    const processQueue = async () => {
      const queued: any[] = JSON.parse(localStorage.getItem(queueKey) || '[]');
      if (!queued.length) return;
      const { supabase } = await import('@/integrations/supabase/client');
      const remain: any[] = [];
      for (const item of queued) {
        const { error } = await supabase.functions.invoke('manifest-finalize', { body: item });
        if (error) remain.push(item);
      }
      localStorage.setItem(queueKey, JSON.stringify(remain));
    };
    window.addEventListener('online', processQueue);
    return () => window.removeEventListener('online', processQueue);
  }, []);

  const renderStepContent = () => {
    switch (step) {
      case 'arrive':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="arriveTime">Arrival Time</Label>
              <Input
                id="arriveTime"
                type="time"
                value={data.arriveTime}
                onChange={(e) => setData(prev => ({ ...prev, arriveTime: e.target.value }))}
              />
            </div>
            <Button onClick={handleNext} className="w-full">
              Start Service
            </Button>
          </div>
        );

      case 'counts':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pteOff">PTE Off Rim</Label>
                <Input
                  id="pteOff"
                  type="number"
                  value={data.pteOff}
                  onChange={(e) => setData(prev => ({ ...prev, pteOff: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="pteOn">PTE On Rim</Label>
                <Input
                  id="pteOn"
                  type="number"
                  value={data.pteOn}
                  onChange={(e) => setData(prev => ({ ...prev, pteOn: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="c175Off">17.5-19.5 Off</Label>
                <Input
                  id="c175Off"
                  type="number"
                  value={data.c175Off}
                  onChange={(e) => setData(prev => ({ ...prev, c175Off: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="c175On">17.5-19.5 On</Label>
                <Input
                  id="c175On"
                  type="number"
                  value={data.c175On}
                  onChange={(e) => setData(prev => ({ ...prev, c175On: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="c225Off">22.5 Off</Label>
                <Input
                  id="c225Off"
                  type="number"
                  value={data.c225Off}
                  onChange={(e) => setData(prev => ({ ...prev, c225Off: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="c225On">22.5 On</Label>
                <Input
                  id="c225On"
                  type="number"
                  value={data.c225On}
                  onChange={(e) => setData(prev => ({ ...prev, c225On: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={data.notes}
                onChange={(e) => setData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <Button onClick={handleNext} className="w-full">
              Next: Photos
            </Button>
          </div>
        );

      case 'photos':
        return (
          <div className="space-y-4">
            <div>
              <Label>Service Photos (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => {
                  if (e.target.files) {
                    setData(prev => ({ ...prev, photos: Array.from(e.target.files!) }));
                  }
                }}
              />
            </div>
            {data.photos.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {data.photos.length} photo(s) selected
              </div>
            )}
            <Button onClick={handleNext} className="w-full">
              Next: Signatures
            </Button>
          </div>
        );

      case 'signatures':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Customer Signature Required</h3>
              <p className="text-sm text-muted-foreground">Hand device to customer to sign</p>
            </div>
            
            <div className="border-2 border-dashed border-muted-foreground/25 p-4 rounded-lg">
              <SignatureCanvas
                ref={customerSigRef}
                canvasProps={{
                  className: 'w-full h-32 border border-border rounded',
                }}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => customerSigRef.current?.clear()}
                className="flex-1"
              >
                Clear
              </Button>
              <Button 
                onClick={() => saveSignature('customer', customerSigRef)}
                disabled={loading || data.customerSigned}
                className="flex-1"
              >
                {loading ? 'Saving...' : data.customerSigned ? '✓ Saved' : 'Save Signature'}
              </Button>
            </div>

            {data.customerSigned && (
              <>
                <div className="text-center">
                  <h3 className="text-lg font-medium">Driver Signature</h3>
                </div>
                
                <div className="border-2 border-dashed border-muted-foreground/25 p-4 rounded-lg">
                  <SignatureCanvas
                    ref={driverSigRef}
                    canvasProps={{
                      className: 'w-full h-32 border border-border rounded',
                    }}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => driverSigRef.current?.clear()}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                  <Button 
                    onClick={async () => {
                      const saved = await saveSignature('driver', driverSigRef);
                      if (saved) handleNext();
                    }}
                    disabled={loading || data.driverSigned}
                    className="flex-1"
                  >
                    {loading ? 'Saving...' : data.driverSigned ? '✓ Complete' : 'Save & Continue'}
                  </Button>
                </div>
              </>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Review & Finalize</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>PTE Off Rim: {data.pteOff}</div>
              <div>PTE On Rim: {data.pteOn}</div>
              <div>17.5-19.5 Off: {data.c175Off}</div>
              <div>17.5-19.5 On: {data.c175On}</div>
              <div>22.5 Off: {data.c225Off}</div>
              <div>22.5 On: {data.c225On}</div>
            </div>
            
            {data.notes && (
              <div>
                <Label>Notes:</Label>
                <p className="text-sm text-muted-foreground">{data.notes}</p>
              </div>
            )}
            
            <div className="text-sm">
              Photos: {data.photos.length}
            </div>
            
            <div className="text-sm">
              Signatures: Customer ✓, Driver ✓
            </div>

            <AcroFormLivePreview
              manifestId={manifestId}
              overrides={{
                pte_off_rim: data.pteOff,
                pte_on_rim: data.pteOn,
                commercial_17_5_19_5_off: data.c175Off,
                commercial_17_5_19_5_on: data.c175On,
                commercial_22_5_off: data.c225Off,
                commercial_22_5_on: data.c225On,
                generator_date: new Date().toISOString().split('T')[0],
                hauler_date: new Date().toISOString().split('T')[0],
              }}
            />
            
            <Button 
              onClick={handleFinalize} 
              disabled={loading || manifestIntegration.isPending || !data.customerSigned || !data.driverSigned}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {(loading || manifestIntegration.isPending) ? 'Generating PDFs...' : 'Finalize Manifest'}
            </Button>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Manifest {manifestId.slice(-8)}</span>
          <span className="text-sm font-normal">{Math.round(progress)}%</span>
        </CardTitle>
        <Progress value={progress} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          {steps.map((s, i) => (
            <div key={s.key} className={`flex items-center gap-1 ${i <= currentStepIndex ? 'text-primary' : ''}`}>
              {s.icon}
              <span>{s.title}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {renderStepContent()}
      </CardContent>
    </Card>
  );
};