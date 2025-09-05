import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Camera, CheckCircle, Clock, FileText, PenTool } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

interface ManifestWizardProps {
  manifestId: string;
  onComplete: () => void;
}

type WizardStep = 'arrive' | 'counts' | 'photos' | 'signatures' | 'review';

export const ManifestWizard: React.FC<ManifestWizardProps> = ({ manifestId, onComplete }) => {
  const [step, setStep] = useState<WizardStep>('arrive');
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
    driverSigned: false
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

  const handleFinalize = async () => {
    try {
      const response = await fetch('/api/manifest/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifestId })
      });
      
      if (response.ok) {
        onComplete();
      } else {
        console.error('Finalization failed');
      }
    } catch (error) {
      console.error('Error finalizing manifest:', error);
    }
  };

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
                canvasProps={{
                  className: 'w-full h-32 border border-border rounded',
                }}
              />
            </div>
            
            <Button 
              onClick={() => setData(prev => ({ ...prev, customerSigned: true }))}
              disabled={!data.customerSigned}
              className="w-full"
            >
              Customer Signed
            </Button>

            {data.customerSigned && (
              <>
                <div className="text-center">
                  <h3 className="text-lg font-medium">Driver Signature</h3>
                </div>
                
                <div className="border-2 border-dashed border-muted-foreground/25 p-4 rounded-lg">
                  <SignatureCanvas
                    canvasProps={{
                      className: 'w-full h-32 border border-border rounded',
                    }}
                  />
                </div>
                
                <Button 
                  onClick={() => {
                    setData(prev => ({ ...prev, driverSigned: true }));
                    handleNext();
                  }}
                  className="w-full"
                >
                  Complete Signatures
                </Button>
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
            
            <Button onClick={handleFinalize} className="w-full bg-green-600 hover:bg-green-700">
              Finalize Manifest
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