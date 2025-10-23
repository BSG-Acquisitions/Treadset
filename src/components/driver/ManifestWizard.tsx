import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Camera, CheckCircle, Clock, FileText, PenTool } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
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
    pteOff: undefined as number | undefined,
    pteOn: undefined as number | undefined,
    c175Off: undefined as number | undefined,
    c175On: undefined as number | undefined,
    c225Off: undefined as number | undefined,
    c225On: undefined as number | undefined,
    notes: '',
    photos: [] as File[],
    customerSigned: false,
    driverSigned: false,
    customerSigPath: '',
    driverSigPath: '',
    customerSigDataUrl: '',
    driverSigDataUrl: ''
  });

  // Restore signatures when returning to signatures step
  useEffect(() => {
    if (step === 'signatures') {
      if (data.customerSigDataUrl && customerSigRef.current && customerSigRef.current.isEmpty()) {
        customerSigRef.current.fromDataURL(data.customerSigDataUrl);
      }
      if (data.driverSigDataUrl && driverSigRef.current && driverSigRef.current.isEmpty()) {
        driverSigRef.current.fromDataURL(data.driverSigDataUrl);
      }
    }
  });

  // Auto-save signatures as they're drawn
  const handleCustomerSignatureEnd = () => {
    if (customerSigRef.current && !customerSigRef.current.isEmpty()) {
      const dataUrl = customerSigRef.current.toDataURL();
      setData(prev => ({ ...prev, customerSigDataUrl: dataUrl }));
    }
  };

  const handleDriverSignatureEnd = () => {
    if (driverSigRef.current && !driverSigRef.current.isEmpty()) {
      const dataUrl = driverSigRef.current.toDataURL();
      setData(prev => ({ ...prev, driverSigDataUrl: dataUrl }));
    }
  };

  // Blur any active input to hide the Android keyboard when starting to sign
  const blurActiveInputs = () => {
    const ae = document.activeElement as HTMLElement | null;
    if (ae && typeof ae.blur === 'function') {
      ae.blur();
    }
  };

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
      toast({
        title: "Signature Required",
        description: "Please provide a signature before saving.",
        variant: "destructive",
      });
      return false;
    }

    try {
      setLoading(true);
      const dataUrl = sigRef.current.toDataURL();
      const canvas = sigRef.current.getTrimmedCanvas();
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(resolve as BlobCallback, 'image/png'));
      
      const fileName = `signatures/${manifestId}/${type}.png`;
      const { error } = await supabase.storage
        .from('manifests')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      if (error) throw error;

      if (type === 'customer') {
        setData(prev => ({ ...prev, customerSigned: true, customerSigPath: fileName, customerSigDataUrl: dataUrl }));
        toast({
          title: "Signature Saved",
          description: "Customer signature has been saved successfully.",
        });
      } else {
        setData(prev => ({ ...prev, driverSigned: true, driverSigPath: fileName, driverSigDataUrl: dataUrl }));
        toast({
          title: "Signature Saved",
          description: "Driver signature has been saved successfully.",
        });
      }

      return true;
    } catch (error) {
      console.error("Failed to save signature:", error);
      toast({
        title: "Error",
        description: "Failed to save signature. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!data.customerSigned || !data.driverSigned) {
      toast({
        title: "Signatures Required",
        description: "Please ensure both customer and driver signatures are saved before finalizing.",
        variant: "destructive",
      });
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
          pte_off_rim: data.pteOff ?? 0,
          pte_on_rim: data.pteOn ?? 0,
          commercial_17_5_19_5_off: data.c175Off ?? 0,
          commercial_17_5_19_5_on: data.c175On ?? 0,
          commercial_22_5_off: data.c225Off ?? 0,
          commercial_22_5_on: data.c225On ?? 0,
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
                  placeholder="0"
                  value={data.pteOff ?? ''}
                  onChange={(e) => setData(prev => ({ ...prev, pteOff: parseInt(e.target.value) || undefined }))}
                />
              </div>
              <div>
                <Label htmlFor="pteOn">PTE On Rim</Label>
                <Input
                  id="pteOn"
                  type="number"
                  placeholder="0"
                  value={data.pteOn ?? ''}
                  onChange={(e) => setData(prev => ({ ...prev, pteOn: parseInt(e.target.value) || undefined }))}
                />
              </div>
              <div>
                <Label htmlFor="c175Off">17.5-19.5 Off</Label>
                <Input
                  id="c175Off"
                  type="number"
                  placeholder="0"
                  value={data.c175Off ?? ''}
                  onChange={(e) => setData(prev => ({ ...prev, c175Off: parseInt(e.target.value) || undefined }))}
                />
              </div>
              <div>
                <Label htmlFor="c175On">17.5-19.5 On</Label>
                <Input
                  id="c175On"
                  type="number"
                  placeholder="0"
                  value={data.c175On ?? ''}
                  onChange={(e) => setData(prev => ({ ...prev, c175On: parseInt(e.target.value) || undefined }))}
                />
              </div>
              <div>
                <Label htmlFor="c225Off">22.5 Off</Label>
                <Input
                  id="c225Off"
                  type="number"
                  placeholder="0"
                  value={data.c225Off ?? ''}
                  onChange={(e) => setData(prev => ({ ...prev, c225Off: parseInt(e.target.value) || undefined }))}
                />
              </div>
              <div>
                <Label htmlFor="c225On">22.5 On</Label>
                <Input
                  id="c225On"
                  type="number"
                  placeholder="0"
                  value={data.c225On ?? ''}
                  onChange={(e) => setData(prev => ({ ...prev, c225On: parseInt(e.target.value) || undefined }))}
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
            
            <div 
              className="border-2 border-dashed border-muted-foreground/25 p-4 rounded-lg"
              onTouchStart={(e) => { blurActiveInputs(); e.stopPropagation(); }}
              onPointerDown={() => blurActiveInputs()}
            >
              <SignatureCanvas
                ref={customerSigRef}
                onEnd={handleCustomerSignatureEnd}
                canvasProps={{
                  className: 'w-full h-40 border border-border rounded touch-none',
                  style: { 
                    touchAction: 'none', 
                    width: '100%', 
                    height: '160px',
                    WebkitUserSelect: 'none',
                    userSelect: 'none'
                  }
                }}
              />
            </div>
            {data.customerSigned && (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Customer signature saved
              </div>
            )}
            
            <div 
              className="flex gap-2"
            >
              <Button 
                type="button"
                variant="outline"
                onClick={() => {
                  customerSigRef.current?.clear();
                  setData(prev => ({ ...prev, customerSigDataUrl: '' }));
                }}
                className="flex-1"
              >
                Clear
              </Button>
              <Button 
                type="button"
                onClick={async () => {
                  await saveSignature('customer', customerSigRef);
                }}
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
                
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 p-4 rounded-lg"
                  onTouchStart={(e) => { blurActiveInputs(); e.stopPropagation(); }}
                  onPointerDown={() => blurActiveInputs()}
                >
                  <SignatureCanvas
                    ref={driverSigRef}
                    onEnd={handleDriverSignatureEnd}
                    canvasProps={{
                      className: 'w-full h-40 border border-border rounded touch-none',
                      style: { 
                        touchAction: 'none', 
                        width: '100%', 
                        height: '160px',
                        WebkitUserSelect: 'none',
                        userSelect: 'none'
                      }
                    }}
                  />
                </div>
                {data.driverSigned && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Driver signature saved
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      driverSigRef.current?.clear();
                      setData(prev => ({ ...prev, driverSigDataUrl: '' }));
                    }}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                  <Button 
                    type="button"
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
                  <div>PTE Off Rim: {data.pteOff ?? 0}</div>
                  <div>PTE On Rim: {data.pteOn ?? 0}</div>
                  <div>17.5-19.5 Off: {data.c175Off ?? 0}</div>
                  <div>17.5-19.5 On: {data.c175On ?? 0}</div>
                  <div>22.5 Off: {data.c225Off ?? 0}</div>
                  <div>22.5 On: {data.c225On ?? 0}</div>
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
                    pte_off_rim: data.pteOff ?? 0,
                    pte_on_rim: data.pteOn ?? 0,
                    commercial_17_5_19_5_off: data.c175Off ?? 0,
                    commercial_17_5_19_5_on: data.c175On ?? 0,
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

  // Mobile full-screen view
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col md:hidden">
        <div className="flex-none p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Complete Manifest</span>
            <span className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="mb-3" />
          
          {/* Step indicators */}
          <div className="flex justify-between">
            {steps.map((s, i) => (
              <div 
                key={s.key}
                className={`flex flex-col items-center gap-1 ${
                  i === currentStepIndex ? 'text-primary' : 
                  i < currentStepIndex ? 'text-green-600' : 'text-muted-foreground'
                }`}
              >
                {s.icon}
                <span className="text-xs">{s.title}</span>
              </div>
            ))}
          </div>
        </div>
        
        <ScrollArea className="flex-1" ref={contentRef}>
          <div className="p-4 pb-24">
            {renderStepContent()}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Tablet/Desktop horizontal layout
  return (
    <Card className="w-full max-w-6xl mx-auto hidden md:flex md:flex-row">
      {/* Left: Form Content */}
      <div className="flex-1 border-r">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-lg">Complete Manifest</CardTitle>
          <div className="text-sm text-muted-foreground">Manifest {manifestId.slice(-8)}</div>
        </CardHeader>

        <CardContent className="px-6 py-4">
          <ScrollArea className="h-[calc(100vh-300px)] pr-4" ref={contentRef}>
            {renderStepContent()}
          </ScrollArea>
        </CardContent>
      </div>

      {/* Right: Navigation & Progress */}
      <div className="w-80 flex flex-col">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold mb-4">Progress</h3>
          <Progress value={progress} className="h-2 mb-4" />
          <p className="text-sm text-muted-foreground">
            Step {currentStepIndex + 1} of {steps.length}
          </p>
        </div>

        <div className="flex-1 px-6 py-4">
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div 
                key={s.key}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  i === currentStepIndex 
                    ? 'bg-primary/10 border-2 border-primary' 
                    : i < currentStepIndex 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-muted border border-border'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  i === currentStepIndex 
                    ? 'bg-primary text-primary-foreground' 
                    : i < currentStepIndex 
                      ? 'bg-green-600 text-white' 
                      : 'bg-muted-foreground/20 text-muted-foreground'
                }`}>
                  {s.icon}
                </div>
                <span className={`text-sm font-medium ${
                  i === currentStepIndex 
                    ? 'text-primary' 
                    : i < currentStepIndex 
                      ? 'text-green-600' 
                      : 'text-muted-foreground'
                }`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};