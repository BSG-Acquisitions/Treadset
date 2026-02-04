import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  Building2, 
  Package, 
  PenTool, 
  CheckCircle, 
  FileText,
  Truck,
  MapPin
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useDestinationEntities, useOwnEntity } from '@/hooks/useEntities';
import { useCreateOutboundManifest, useUpdateOutboundManifestSignatures } from '@/hooks/useOutboundManifests';
import { useCompleteOutboundDelivery } from '@/hooks/useOutboundAssignments';
import { useManifestIntegration } from '@/hooks/useManifestIntegration';
import { useCreateShipmentFromManifest } from '@/hooks/useCreateShipmentFromManifest';
import { convertToTons, pteToTons } from '@/lib/michigan-conversions';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type MaterialForm = Database['public']['Enums']['material_form'];
type UnitBasis = Database['public']['Enums']['unit_basis'];

interface OutboundManifestWizardProps {
  onComplete: (manifestId: string) => void;
  onCancel: () => void;
  assignmentId?: string; // If provided, pre-fills from the assignment
}

type WizardStep = 'destination' | 'material' | 'signatures' | 'review' | 'complete';

const MATERIAL_FORMS: { value: MaterialForm; label: string }[] = [
  { value: 'whole_off_rim', label: 'Whole Tires (Off Rim)' },
  { value: 'shreds', label: 'Shredded Material' },
  { value: 'crumb', label: 'Crumb Rubber' },
  { value: 'baled', label: 'Baled Tires' },
  { value: 'tdf', label: 'TDF (Tire Derived Fuel)' },
];

const UNIT_OPTIONS: { value: UnitBasis; label: string }[] = [
  { value: 'tons', label: 'Tons' },
  { value: 'pte', label: 'PTE (Passenger Tire Equivalent)' },
  { value: 'cubic_yards', label: 'Cubic Yards' },
];

export const OutboundManifestWizard: React.FC<OutboundManifestWizardProps> = ({ 
  onComplete, 
  onCancel,
  assignmentId
}) => {
  const [step, setStep] = useState<WizardStep>('destination');
  const [loading, setLoading] = useState(false);
  const [createdManifestId, setCreatedManifestId] = useState<string | null>(null);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useAuth();
  const generatorSigRef = useRef<SignatureCanvas>(null);
  const haulerSigRef = useRef<SignatureCanvas>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Data hooks
  const { data: destinations = [], isLoading: destinationsLoading } = useDestinationEntities();
  const { data: ownEntity, isLoading: ownEntityLoading } = useOwnEntity();
  const createManifest = useCreateOutboundManifest();
  const updateSignatures = useUpdateOutboundManifestSignatures();
  const manifestIntegration = useManifestIntegration();
  const completeDelivery = useCompleteOutboundDelivery();
  const createShipment = useCreateShipmentFromManifest();

  // Form state
  const [data, setData] = useState({
    destinationId: '',
    materialForm: 'whole_off_rim' as MaterialForm,
    quantity: 0,
    unitBasis: 'tons' as UnitBasis,
    notes: '',
    generatorName: '',
    generatorSigDataUrl: '',
    generatorSigPath: '',
    generatorSigned: false,
    haulerSigDataUrl: '',
    haulerSigPath: '',
    haulerSigned: false,
  });

  // Load assignment data if assignmentId is provided
  useEffect(() => {
    const loadAssignment = async () => {
      if (!assignmentId) return;

      const { data: assignment, error } = await supabase
        .from('outbound_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (error || !assignment) return;

      // Pre-fill form data from assignment
      setData(prev => ({
        ...prev,
        destinationId: assignment.destination_entity_id || '',
        materialForm: (assignment.material_form as MaterialForm) || 'whole_off_rim',
        quantity: assignment.estimated_quantity || 0,
        unitBasis: (assignment.estimated_unit as UnitBasis) || 'tons',
        notes: assignment.notes || '',
      }));

      // Update assignment status to in_progress
      await supabase
        .from('outbound_assignments')
        .update({ status: 'in_progress' })
        .eq('id', assignmentId);
    };

    loadAssignment();
  }, [assignmentId]);

  // Get driver name for hauler signature
  const haulerName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : 'Driver';

  // Scroll to top when step changes
  useEffect(() => {
    if (contentRef.current && isMobile) {
      contentRef.current.scrollTop = 0;
    }
  }, [step, isMobile]);

  // Restore signatures when returning to signatures step
  useEffect(() => {
    if (step === 'signatures') {
      if (data.generatorSigDataUrl && generatorSigRef.current && generatorSigRef.current.isEmpty()) {
        generatorSigRef.current.fromDataURL(data.generatorSigDataUrl);
      }
      if (data.haulerSigDataUrl && haulerSigRef.current && haulerSigRef.current.isEmpty()) {
        haulerSigRef.current.fromDataURL(data.haulerSigDataUrl);
      }
    }
  }, [step, data.generatorSigDataUrl, data.haulerSigDataUrl]);

  const steps: Array<{ key: WizardStep; title: string; icon: React.ReactNode }> = [
    { key: 'destination', title: 'Destination', icon: <Building2 className="h-4 w-4" /> },
    { key: 'material', title: 'Material', icon: <Package className="h-4 w-4" /> },
    { key: 'signatures', title: 'Signatures', icon: <PenTool className="h-4 w-4" /> },
    { key: 'review', title: 'Review', icon: <FileText className="h-4 w-4" /> },
    { key: 'complete', title: 'Complete', icon: <CheckCircle className="h-4 w-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Calculate PTE and tons based on input
  const calculateQuantities = () => {
    const quantity = data.quantity || 0;
    let pte = 0;
    let tons = 0;

    if (data.unitBasis === 'pte') {
      pte = quantity;
      tons = pteToTons(quantity);
    } else if (data.unitBasis === 'tons') {
      tons = quantity;
      pte = Math.round(tons * 89); // Approximate conversion
    } else if (data.unitBasis === 'cubic_yards') {
      tons = convertToTons(quantity, 'cubic_yards', data.materialForm);
      pte = Math.round(tons * 89);
    }

    return { pte: Math.round(pte), tons: Math.round(tons * 100) / 100 };
  };

  const selectedDestination = destinations.find(d => d.id === data.destinationId);
  const { pte, tons } = calculateQuantities();

  // Blur active inputs before signing
  const blurActiveInputs = () => {
    const ae = document.activeElement as HTMLElement | null;
    if (ae && typeof ae.blur === 'function') {
      ae.blur();
    }
  };

  // Auto-save signatures
  const handleGeneratorSignatureEnd = () => {
    if (generatorSigRef.current && !generatorSigRef.current.isEmpty()) {
      const dataUrl = generatorSigRef.current.toDataURL();
      setData(prev => ({ ...prev, generatorSigDataUrl: dataUrl }));
    }
  };

  const handleHaulerSignatureEnd = () => {
    if (haulerSigRef.current && !haulerSigRef.current.isEmpty()) {
      const dataUrl = haulerSigRef.current.toDataURL();
      setData(prev => ({ ...prev, haulerSigDataUrl: dataUrl }));
    }
  };

  const saveSignature = async (type: 'generator' | 'hauler', sigRef: React.RefObject<SignatureCanvas>) => {
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
      
      // Use temp ID for now, will update after manifest creation
      const tempId = `outbound-${Date.now()}`;
      const fileName = `signatures/${tempId}/${type}.png`;
      
      const { error } = await supabase.storage
        .from('manifests')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      if (error) throw error;

      if (type === 'generator') {
        setData(prev => ({ 
          ...prev, 
          generatorSigned: true, 
          generatorSigPath: fileName, 
          generatorSigDataUrl: dataUrl 
        }));
      } else {
        setData(prev => ({ 
          ...prev, 
          haulerSigned: true, 
          haulerSigPath: fileName, 
          haulerSigDataUrl: dataUrl 
        }));
      }

      toast({
        title: "Signature Saved",
        description: `${type === 'generator' ? 'Generator' : 'Hauler'} signature has been saved.`,
      });

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

  const handleCreateManifest = async () => {
    if (!ownEntity) {
      toast({
        title: "Error",
        description: "Could not determine origin facility. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    if (!data.generatorSigned || !data.haulerSigned) {
      toast({
        title: "Signatures Required",
        description: "Please ensure both signatures are saved before creating the manifest.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Create the manifest
      const manifest = await createManifest.mutateAsync({
        destination_entity_id: data.destinationId,
        origin_entity_id: ownEntity.id,
        material_form: data.materialForm,
        quantity: data.quantity,
        unit_basis: data.unitBasis,
        quantity_pte: pte,
        notes: data.notes,
      });

      // Update with signature paths
      await updateSignatures.mutateAsync({
        manifestId: manifest.id,
        generatorSigPath: data.generatorSigPath,
        haulerSigPath: data.haulerSigPath,
      });

      // Generate PDF
      const currentDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });

      await manifestIntegration.mutateAsync({
        manifestId: manifest.id,
        overrides: {
          generator_date: currentDate,
          generator_time: currentTime,
          hauler_date: currentDate,
          hauler_time: currentTime,
        }
      });

      // If this was from an assignment, complete it and link the manifest
      if (assignmentId) {
        await completeDelivery.mutateAsync({
          assignmentId,
          manifestId: manifest.id,
        });
      }

      // Auto-create shipment record for Michigan Reports outbound tracking
      try {
        await createShipment.mutateAsync({
          manifestId: manifest.id,
          originEntityId: ownEntity.id,
          destinationEntityId: data.destinationId,
          materialForm: data.materialForm,
          quantityPte: pte,
          departedAt: new Date().toISOString(),
          arrivedAt: new Date().toISOString(),
        });
        console.log('Shipment record created for outbound manifest:', manifest.id);
      } catch (shipmentError) {
        // Don't fail the manifest creation if shipment fails
        console.error('Failed to create shipment record:', shipmentError);
      }

      setCreatedManifestId(manifest.id);
      setStep('complete');
    } catch (error: any) {
      console.error("Error creating manifest:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create manifest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].key);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].key);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'destination':
        return !!data.destinationId;
      case 'material':
        return data.quantity > 0;
      case 'signatures':
        return data.generatorSigned && data.haulerSigned;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'destination':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Where are you taking this load?</h3>
              <p className="text-sm text-muted-foreground">Select the destination processor</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="destination">Destination</Label>
                <Select
                  value={data.destinationId}
                  onValueChange={(value) => setData(prev => ({ ...prev, destinationId: value }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select destination..." />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.legal_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDestination && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{selectedDestination.legal_name}</p>
                        {selectedDestination.street_address && (
                          <p className="text-sm text-muted-foreground">
                            {selectedDestination.street_address}
                            {selectedDestination.city && `, ${selectedDestination.city}`}
                            {selectedDestination.state && ` ${selectedDestination.state}`}
                            {selectedDestination.zip && ` ${selectedDestination.zip}`}
                          </p>
                        )}
                        {selectedDestination.eg_number && (
                          <p className="text-xs text-muted-foreground mt-1">
                            EG#: {selectedDestination.eg_number}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Button 
              onClick={handleNext} 
              disabled={!canProceed() || destinationsLoading}
              className="w-full h-12"
            >
              Next: Material Details
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        );

      case 'material':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">What material are you hauling?</h3>
              <p className="text-sm text-muted-foreground">Enter the material type and quantity</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="materialForm">Material Type</Label>
                <Select
                  value={data.materialForm}
                  onValueChange={(value) => setData(prev => ({ ...prev, materialForm: value as MaterialForm }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_FORMS.map((form) => (
                      <SelectItem key={form.value} value={form.value}>
                        {form.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.quantity || ''}
                    onChange={(e) => setData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    className="h-12 text-lg"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="unitBasis">Unit</Label>
                  <Select
                    value={data.unitBasis}
                    onValueChange={(value) => setData(prev => ({ ...prev, unitBasis: value as UnitBasis }))}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {data.quantity > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Calculated:</span>
                      <div className="text-right">
                        <Badge variant="secondary" className="mr-2">
                          {pte.toLocaleString()} PTE
                        </Badge>
                        <Badge variant="outline">
                          {tons.toLocaleString()} tons
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={data.notes}
                  onChange={(e) => setData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes about this load..."
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!canProceed()}
                className="flex-1 h-12"
              >
                Next: Signatures
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'signatures':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Collect Origin Signatures</h3>
              <p className="text-sm text-muted-foreground">
                BSG representative signs as Generator, then you sign as Hauler
              </p>
            </div>

            {/* Generator Signature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Generator Signature (BSG)</Label>
                {data.generatorSigned && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </div>
              
              <div>
                <Label htmlFor="generatorName" className="text-sm">Print Name</Label>
                <Input
                  id="generatorName"
                  value={data.generatorName}
                  onChange={(e) => setData(prev => ({ ...prev, generatorName: e.target.value }))}
                  placeholder="Facility representative name"
                  className="h-10"
                />
              </div>

              <div 
                className="border-2 border-dashed border-muted-foreground/25 p-2 rounded-lg"
                onTouchStart={(e) => { blurActiveInputs(); e.stopPropagation(); }}
                onPointerDown={() => blurActiveInputs()}
              >
                <SignatureCanvas
                  ref={generatorSigRef}
                  onEnd={handleGeneratorSignatureEnd}
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

              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    generatorSigRef.current?.clear();
                    setData(prev => ({ ...prev, generatorSigDataUrl: '', generatorSigned: false }));
                  }}
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button 
                  type="button"
                  size="sm"
                  onClick={() => saveSignature('generator', generatorSigRef)}
                  disabled={loading || data.generatorSigned}
                  className="flex-1"
                >
                  {data.generatorSigned ? 'Saved' : 'Save Signature'}
                </Button>
              </div>
            </div>

            {/* Hauler Signature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Hauler Signature (Driver)</Label>
                {data.haulerSigned && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>{haulerName}</span>
              </div>

              <div 
                className="border-2 border-dashed border-muted-foreground/25 p-2 rounded-lg"
                onTouchStart={(e) => { blurActiveInputs(); e.stopPropagation(); }}
                onPointerDown={() => blurActiveInputs()}
              >
                <SignatureCanvas
                  ref={haulerSigRef}
                  onEnd={handleHaulerSignatureEnd}
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

              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    haulerSigRef.current?.clear();
                    setData(prev => ({ ...prev, haulerSigDataUrl: '', haulerSigned: false }));
                  }}
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button 
                  type="button"
                  size="sm"
                  onClick={() => saveSignature('hauler', haulerSigRef)}
                  disabled={loading || data.haulerSigned}
                  className="flex-1"
                >
                  {data.haulerSigned ? 'Saved' : 'Save Signature'}
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!canProceed()}
                className="flex-1 h-12"
              >
                Review
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Review Outbound Manifest</h3>
              <p className="text-sm text-muted-foreground">Confirm the details before creating</p>
            </div>

            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-medium">{ownEntity?.legal_name || 'BSG'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">To</p>
                    <p className="font-medium">{selectedDestination?.legal_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Material</p>
                    <p className="font-medium">
                      {MATERIAL_FORMS.find(f => f.value === data.materialForm)?.label} - {data.quantity} {data.unitBasis}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {pte.toLocaleString()} PTE • {tons.toLocaleString()} tons
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {data.generatorSigned ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2" />
                    )}
                    <span className="text-sm">Generator signed (BSG)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.haulerSigned ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2" />
                    )}
                    <span className="text-sm">Hauler signed ({haulerName})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-dashed" />
                    <span className="text-sm text-muted-foreground">Receiver pending (at destination)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleCreateManifest}
                disabled={loading}
                className="flex-1 h-12"
              >
                {loading ? 'Creating...' : 'Create Manifest'}
                <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            <div>
              <h3 className="text-xl font-semibold">Manifest Created!</h3>
              <p className="text-muted-foreground mt-2">
                Receiver signature pending - complete this when you arrive at the destination
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => createdManifestId && onComplete(createdManifestId)}
                className="w-full h-12"
              >
                Go to My Outbound Manifests
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-lg">Outbound Manifest</CardTitle>
          {step !== 'complete' && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        {step !== 'complete' && (
          <>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2">
              {steps.slice(0, -1).map((s, i) => (
                <div 
                  key={s.key}
                  className={`flex items-center gap-1 text-xs ${
                    i <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {s.icon}
                  <span className="hidden sm:inline">{s.title}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardHeader>
      <CardContent ref={contentRef}>
        {renderStepContent()}
      </CardContent>
    </Card>
  );
};
