import { useState } from 'react';
import { useStateComplianceConfigs, useUpdateStateCompliance, US_STATES, type StateComplianceConfig } from '@/hooks/useStateCompliance';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Save, Zap, MapPin } from 'lucide-react';

// Standard domain fields that every state manifest must map to
const DOMAIN_FIELDS = [
  { key: 'manifest_number', label: 'Manifest Number', section: 'Header' },
  { key: 'vehicle_trailer', label: 'Vehicle/Trailer', section: 'Header' },
  { key: 'generator_name', label: 'Generator Name', section: 'Generator' },
  { key: 'generator_mail_address', label: 'Generator Mailing Address', section: 'Generator' },
  { key: 'generator_city', label: 'Generator City', section: 'Generator' },
  { key: 'generator_state', label: 'Generator State', section: 'Generator' },
  { key: 'generator_zip', label: 'Generator Zip', section: 'Generator' },
  { key: 'generator_county', label: 'Generator County', section: 'Generator' },
  { key: 'generator_phone', label: 'Generator Phone', section: 'Generator' },
  { key: 'generator_physical_address', label: 'Physical Address', section: 'Generator Physical' },
  { key: 'generator_physical_city', label: 'Physical City', section: 'Generator Physical' },
  { key: 'generator_physical_state', label: 'Physical State', section: 'Generator Physical' },
  { key: 'generator_physical_zip', label: 'Physical Zip', section: 'Generator Physical' },
  { key: 'hauler_name', label: 'Hauler Name', section: 'Hauler' },
  { key: 'hauler_mail_address', label: 'Hauler Address', section: 'Hauler' },
  { key: 'hauler_city', label: 'Hauler City', section: 'Hauler' },
  { key: 'hauler_state', label: 'Hauler State', section: 'Hauler' },
  { key: 'hauler_zip', label: 'Hauler Zip', section: 'Hauler' },
  { key: 'hauler_phone', label: 'Hauler Phone', section: 'Hauler' },
  { key: 'hauler_mi_reg', label: 'Hauler Registration', section: 'Hauler' },
  { key: 'hauler_other_id', label: 'Other ID / Site Reg', section: 'Hauler' },
  { key: 'receiver_name', label: 'Receiver Name', section: 'Receiver' },
  { key: 'receiver_physical_address', label: 'Receiver Address', section: 'Receiver' },
  { key: 'receiver_city', label: 'Receiver City', section: 'Receiver' },
  { key: 'receiver_state', label: 'Receiver State', section: 'Receiver' },
  { key: 'receiver_zip', label: 'Receiver Zip', section: 'Receiver' },
  { key: 'receiver_phone', label: 'Receiver Phone', section: 'Receiver' },
  { key: 'passenger_car_count', label: 'Passenger Car Count', section: 'Tire Counts' },
  { key: 'truck_count', label: 'Truck Count', section: 'Tire Counts' },
  { key: 'oversized_count', label: 'Oversized Count', section: 'Tire Counts' },
  { key: 'hauler_gross_weight', label: 'Gross Weight', section: 'Weights' },
  { key: 'hauler_tare_weight', label: 'Tare Weight', section: 'Weights' },
  { key: 'hauler_net_weight', label: 'Net Weight', section: 'Weights' },
  { key: 'generator_volume_weight', label: 'PTE (Generator)', section: 'Weights' },
  { key: 'hauler_total_pte', label: 'PTE (Hauler)', section: 'Weights' },
  { key: 'receiver_total_pte', label: 'PTE (Receiver)', section: 'Weights' },
  { key: 'generator_signature', label: 'Generator Signature', section: 'Signatures' },
  { key: 'hauler_signature', label: 'Hauler Signature', section: 'Signatures' },
  { key: 'receiver_signature', label: 'Receiver Signature', section: 'Signatures' },
  { key: 'generator_print_name', label: 'Generator Print Name', section: 'Signatures' },
  { key: 'hauler_print_name', label: 'Hauler Print Name', section: 'Signatures' },
  { key: 'receiver_print_name', label: 'Receiver Print Name', section: 'Signatures' },
  { key: 'generator_date', label: 'Generator Date', section: 'Signatures' },
  { key: 'hauler_date', label: 'Hauler Date', section: 'Signatures' },
  { key: 'receiver_date', label: 'Receiver Date', section: 'Signatures' },
];

export default function StateTemplateManager() {
  const { data: configs, isLoading } = useStateComplianceConfigs();
  const updateMutation = useUpdateStateCompliance();
  const [selectedState, setSelectedState] = useState<string>('');
  const [extractedFields, setExtractedFields] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [pteRatio, setPteRatio] = useState<string>('89');
  const [regLabel, setRegLabel] = useState<string>('State Registration #');

  const selectedConfig = configs?.find(c => c.state_code === selectedState);

  const handleStateSelect = (code: string) => {
    setSelectedState(code);
    const config = configs?.find(c => c.state_code === code);
    if (config) {
      setFieldMapping(config.field_mapping || {});
      setPteRatio(String(config.pte_to_ton_ratio));
      setRegLabel(config.registration_label);
    } else {
      setFieldMapping({});
      setPteRatio('89');
      setRegLabel('State Registration #');
    }
    setExtractedFields([]);
  };

  const handleUploadTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedState) return;

    setUploading(true);
    try {
      const stateName = US_STATES.find(s => s.code === selectedState)?.name || selectedState;
      const fileName = `${selectedState}_Manifest_Template.pdf`;
      const storagePath = `templates/${fileName}`;

      const { error } = await supabase.storage
        .from('manifests')
        .upload(storagePath, file, { contentType: 'application/pdf', upsert: true });

      if (error) throw error;

      // Update or create the state config
      await updateMutation.mutateAsync({
        state_code: selectedState,
        state_name: stateName,
        manifest_template_path: fileName,
        requires_government_manifest: true,
      });

      toast.success(`Template uploaded for ${stateName}`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleExtractFields = async () => {
    if (!selectedConfig?.manifest_template_path) {
      toast.error('No template uploaded for this state');
      return;
    }

    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-acroform-fields', {
        body: { templatePath: selectedConfig.manifest_template_path },
      });

      if (error) throw error;

      const fields = data?.fields || data?.fieldNames || [];
      setExtractedFields(Array.isArray(fields) ? fields : Object.keys(fields));
      toast.success(`Extracted ${fields.length} fields from template`);
    } catch (error: any) {
      console.error('Extract error:', error);
      toast.error(`Field extraction failed: ${error.message}`);
    } finally {
      setExtracting(false);
    }
  };

  const handleMappingChange = (domainKey: string, pdfField: string) => {
    setFieldMapping(prev => {
      if (!pdfField) {
        const next = { ...prev };
        delete next[domainKey];
        return next;
      }
      return { ...prev, [domainKey]: pdfField };
    });
  };

  const handleSaveMapping = async () => {
    if (!selectedState) return;
    const stateName = US_STATES.find(s => s.code === selectedState)?.name || selectedState;

    try {
      await updateMutation.mutateAsync({
        state_code: selectedState,
        state_name: stateName,
        field_mapping: Object.keys(fieldMapping).length > 0 ? fieldMapping : null,
        pte_to_ton_ratio: Number(pteRatio) || 89,
        registration_label: regLabel,
      });
      toast.success('Mapping saved successfully');
    } catch (error: any) {
      toast.error(`Save failed: ${error.message}`);
    }
  };

  const handleTestFill = async () => {
    if (!selectedConfig?.manifest_template_path || Object.keys(fieldMapping).length === 0) {
      toast.error('Upload a template and create mappings first');
      return;
    }

    try {
      // Build test data using the field mapping
      const testData: Record<string, string> = {};
      for (const [domainKey, pdfField] of Object.entries(fieldMapping)) {
        const domainDef = DOMAIN_FIELDS.find(d => d.key === domainKey);
        testData[pdfField] = `[TEST: ${domainDef?.label || domainKey}]`;
      }

      const { data, error } = await supabase.functions.invoke('generate-acroform-manifest', {
        body: {
          templatePath: selectedConfig.manifest_template_path,
          manifestData: testData,
          manifestId: 'test-fill',
          outputPath: `manifests/test-fill-${selectedState}-${Date.now()}.pdf`,
        },
      });

      if (error) throw error;

      // Open the test PDF
      if (data?.pdfPath || data?.pdf_path) {
        const path = data.pdfPath || data.pdf_path;
        const { data: signedUrl } = await supabase.storage
          .from('manifests')
          .createSignedUrl(path, 300);
        if (signedUrl?.signedUrl) {
          window.open(signedUrl.signedUrl, '_blank');
        }
      }

      toast.success('Test PDF generated — check the opened tab');
    } catch (error: any) {
      toast.error(`Test fill failed: ${error.message}`);
    }
  };

  // Group domain fields by section
  const sections = DOMAIN_FIELDS.reduce((acc, field) => {
    if (!acc[field.section]) acc[field.section] = [];
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, typeof DOMAIN_FIELDS>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">State Template Manager</h1>
        <p className="text-muted-foreground">
          Upload state-specific manifest PDFs, extract fields, and create field mappings.
        </p>
      </div>

      {/* State Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select State
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Select value={selectedState} onValueChange={handleStateSelect}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a state..." />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => {
                const hasConfig = configs?.find(c => c.state_code === s.code);
                return (
                  <SelectItem key={s.code} value={s.code}>
                    <span className="flex items-center gap-2">
                      {s.name} ({s.code})
                      {hasConfig?.manifest_template_path && (
                        <CheckCircle className="h-3 w-3 text-primary" />
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {selectedConfig && (
            <div className="flex gap-2">
              {selectedConfig.manifest_template_path ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Template uploaded
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> No template
                </Badge>
              )}
              {selectedConfig.field_mapping && Object.keys(selectedConfig.field_mapping).length > 0 ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> {Object.keys(selectedConfig.field_mapping).length} fields mapped
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> No mapping
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedState && (
        <>
          {/* State Settings */}
          <Card>
            <CardHeader>
              <CardTitle>State Settings</CardTitle>
              <CardDescription>Configure state-specific conversion ratios and labels</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PTE-to-Ton Ratio</Label>
                <Input
                  type="number"
                  value={pteRatio}
                  onChange={(e) => setPteRatio(e.target.value)}
                  placeholder="89"
                />
                <p className="text-xs text-muted-foreground">Michigan uses 89. Check your state's rules.</p>
              </div>
              <div className="space-y-2">
                <Label>Hauler Registration Label</Label>
                <Input
                  value={regLabel}
                  onChange={(e) => setRegLabel(e.target.value)}
                  placeholder="State Registration #"
                />
              </div>
            </CardContent>
          </Card>

          {/* Template Upload & Extract */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Template PDF
              </CardTitle>
              <CardDescription>
                Upload the state's official AcroForm manifest PDF, then extract its field names.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label
                  htmlFor="pdf-upload"
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload PDF Template'}
                </Label>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleUploadTemplate}
                  disabled={uploading}
                />

                {selectedConfig?.manifest_template_path && (
                  <Button onClick={handleExtractFields} disabled={extracting} variant="outline">
                    {extracting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    Extract Fields
                  </Button>
                )}
              </div>

              {selectedConfig?.manifest_template_path && (
                <p className="text-sm text-muted-foreground">
                  Current template: <code className="bg-muted px-1 rounded">{selectedConfig.manifest_template_path}</code>
                </p>
              )}

              {extractedFields.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Discovered {extractedFields.length} AcroForm fields:</p>
                  <div className="flex flex-wrap gap-1">
                    {extractedFields.map((field) => (
                      <Badge key={field} variant="outline" className="text-xs font-mono">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Field Mapping Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Field Mapping</CardTitle>
              <CardDescription>
                Map standard domain fields (left) to this state's PDF AcroForm field names (right).
                {extractedFields.length === 0 && ' Extract fields first, or type field names manually.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {Object.entries(sections).map(([sectionName, fields]) => (
                    <div key={sectionName}>
                      <h3 className="text-sm font-semibold text-foreground mb-2">{sectionName}</h3>
                      <div className="space-y-2">
                        {fields.map((field) => (
                          <div key={field.key} className="grid grid-cols-2 gap-3 items-center">
                            <Label className="text-sm truncate" title={field.key}>
                              {field.label}
                            </Label>
                            {extractedFields.length > 0 ? (
                              <Select
                                value={fieldMapping[field.key] || ''}
                                onValueChange={(v) => handleMappingChange(field.key, v)}
                              >
                                <SelectTrigger className="text-xs font-mono">
                                  <SelectValue placeholder="— unmapped —" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">— unmapped —</SelectItem>
                                  {extractedFields.map((ef) => (
                                    <SelectItem key={ef} value={ef} className="text-xs font-mono">
                                      {ef}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                className="text-xs font-mono"
                                value={fieldMapping[field.key] || ''}
                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                placeholder="PDF field name"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                <Button onClick={handleSaveMapping} disabled={updateMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Mapping
                </Button>
                <Button variant="outline" onClick={handleTestFill}>
                  <FileText className="mr-2 h-4 w-4" />
                  Test Fill
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
