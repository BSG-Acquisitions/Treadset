import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Camera, CheckCircle, Clock, FileText, PenTool } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

import { useManifestIntegration } from '@/hooks/useManifestIntegration';
import { useSendManifestEmail } from '@/hooks/useSendManifestEmail';
import { AcroFormLivePreview } from '@/components/manifest/AcroFormLivePreview';

interface ManifestWizardProps {
  manifestId: string;
  onComplete: () => void;
}

type WizardStep = 'arrive' | 'counts' | 'photos' | 'signatures' | 'review';

export const ManifestWizard: React.FC<ManifestWizardProps> = ({ manifestId, onComplete }) => {
  const [step, setStep] = useState<WizardStep>('arrive');
  const [loading, setLoading] = useState(false);
  const [manifestCompleted, setManifestCompleted] = useState(false);
  const [clientEmails, setClientEmails] = useState<string[]>([]);
  
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);
  const manifestIntegration = useManifestIntegration();
  const sendEmail = useSendManifestEmail();
  const customerSigRef = useRef<SignatureCanvas>(null);
  const driverSigRef = useRef<SignatureCanvas>(null);

  // Scroll to top when step changes
  useEffect(() => {
    if (contentRef.current && isMobile) {
      contentRef.current.scrollTop = 0;
    }
  }, [step, isMobile]);

  // Handle input focus on mobile - scroll into view
  useEffect(() => {
    if (!isMobile) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Delay to allow keyboard to appear
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, [isMobile]);
  
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
      console.error("Please provide a signature");
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
      console.error("Failed to save signature:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!data.customerSigned || !data.driverSigned) {
      console.error("Both signatures are required");
      return;
    }

    try {
      setLoading(true);

      // Get current timestamp for signatures
      const timestamp = new Date().toISOString();
      const currentDate = timestamp.split('T')[0];
      const currentTime = new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });

      // Update manifest with collected data and timestamps
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
          generator_signed_at: timestamp,
          hauler_signed_at: timestamp,
          tare_weight_lbs: 0,
          status: 'AWAITING_FINALIZATION'
        })
        .eq('id', manifestId);

      if (updateError) throw updateError;

      // Get client email for sending after update
      const { data: manifest, error: selectError } = await supabase
        .from('manifests')
        .select(`
          *,
          clients:client_id(company_name, email)
        `)
        .eq('id', manifestId)
        .single();

      if (selectError) {
        console.error('Failed to fetch manifest details:', selectError);
      } else if (manifest?.clients?.email) {
        setClientEmails([manifest.clients.email]);
      }

      // Store client emails for sending
      if (manifest?.clients?.email) {
        setClientEmails([manifest.clients.email]);
      }

      const payload = { manifest_id: manifestId };
      const queueKey = 'manifestFinalizeQueue';

      const execute = async () => {
        // Use the new integration hook that generates both PDFs with timestamp overrides
        const result = await manifestIntegration.mutateAsync({ 
          manifestId,
          overrides: {
            generator_date: currentDate,
            generator_time: currentTime,
            hauler_date: currentDate,
            hauler_time: currentTime,
          }
        });
        return result;
      };

      if (!navigator.onLine) {
        const queued = JSON.parse(localStorage.getItem(queueKey) || '[]');
        queued.push(payload);
        localStorage.setItem(queueKey, JSON.stringify(queued));
        console.log("Manifest will be finalized when online");
        setManifestCompleted(true);
        return;
      }

      await execute();
      console.log("Manifest finalized - ready to send");
      setManifestCompleted(true);
    } catch (error: any) {
      console.error("Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendManifest = async () => {
    if (clientEmails.length === 0) {
      console.error("No client email available");
      return;
    }

    try {
      await sendEmail.mutateAsync({
        manifestId,
        to: clientEmails,
        subject: "Manifest Complete - Tire Collection Service",
        messageHtml: "<p>Your tire collection service has been completed. Please find the attached manifest.</p>"
      });
      
      onComplete();
    } catch (error) {
      console.error("Failed to send manifest:", error);
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
            {!manifestCompleted ? (
              <>
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
              </>
            ) : (
              <>
                <div className="text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <h3 className="text-lg font-medium text-green-700">Manifest Complete!</h3>
                  <p className="text-sm text-muted-foreground">
                    PDF has been generated with timestamps and signatures
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    onClick={handleSendManifest}
                    disabled={sendEmail.isPending || clientEmails.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {sendEmail.isPending ? 'Sending...' : 'Send Manifest to Client'}
                  </Button>
                  
                  <Button 
                    onClick={onComplete}
                    variant="outline"
                    className="w-full"
                  >
                    Finish Without Sending
                  </Button>
                </div>
                
                {clientEmails.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    No client email available for sending
                  </p>
                )}
              </>
            )}
          </div>
        );
    }
  };

  return (
    <Card className={`w-full max-w-md mx-auto ${isMobile ? 'h-[calc(100vh-2rem)] flex flex-col' : ''}`}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span>Manifest {manifestId.slice(-8)}</span>
          <span className="text-sm font-normal">{Math.round(progress)}%</span>
        </CardTitle>
        <Progress value={progress} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          {steps.map((s, i) => (
            <div key={s.key} className={`flex items-center gap-1 ${i <= currentStepIndex ? 'text-primary' : ''}`}>
              {s.icon}
              <span className="hidden sm:inline">{s.title}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className={isMobile ? 'flex-1 overflow-hidden p-0' : ''}>
        {isMobile ? (
          <ScrollArea className="h-full">
            <div ref={contentRef} className="p-6 pb-32">
              {renderStepContent()}
            </div>
          </ScrollArea>
        ) : (
          <div ref={contentRef}>
            {renderStepContent()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};