import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AcroFormManifestEditor } from '@/components/manifest/AcroFormManifestEditor';
import { BusinessDataEditor } from '@/components/manifest/BusinessDataEditor';
import { useGenerateAcroFormManifest, convertToAcroFormFields } from '@/hooks/useAcroFormManifest';
import { useSendManifestEmail } from '@/hooks/useSendManifestEmail';
import { AcroFormManifestData, ManifestBusinessData } from '@/types/acroform-manifest';
import { uploadAcroFormTemplate } from '@/utils/uploadTemplate';
import { useToast } from '@/hooks/use-toast';

export default function AcroFormDemo() {
  const { toast } = useToast();
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generatedPdfPath, setGeneratedPdfPath] = useState<string | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [stateData, setStateData] = useState<Partial<AcroFormManifestData>>({
    manifest_number: 'M-2024-001',
    vehicle_trailer: 'T-123',
    generator_name: 'ABC Tire Shop',
    generator_city: 'Detroit',
    generator_state: 'MI',
    hauler_name: 'BSG Logistics',
    hauler_mi_reg: 'H-12345',
    receiver_name: 'Tire Recycling Center'
  });

  const [businessData, setBusinessData] = useState<Partial<ManifestBusinessData>>({
    pte_off_rim: 50,
    pte_on_rim: 25,
    otr_count: 10,
    unit_prices: {
      pte_off_rim: 2.50,
      pte_on_rim: 3.00,
      otr: 15.00,
      commercial_17_5_19_5_off: 0,
      commercial_17_5_19_5_on: 0,
      commercial_22_5_off: 0,
      commercial_22_5_on: 0,
      tractor: 0
    }
  });

  const generateManifest = useGenerateAcroFormManifest();
  const sendEmail = useSendManifestEmail();

  const handleUploadTemplate = async () => {
    setIsUploadingTemplate(true);
    try {
      await uploadAcroFormTemplate();
      toast({
        title: "Template Uploaded",
        description: "AcroForm template uploaded to storage successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload template.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const handleGenerate = async () => {
    const acroFormFields = convertToAcroFormFields(stateData);
    
    try {
      const result = await generateManifest.mutateAsync({
        templatePath: 'Michigan_Manifest_AcroForm.pdf',
        manifestData: acroFormFields,
        outputPath: `manifests/demo-${Date.now()}.pdf`
      });
      
      setGeneratedPdfUrl(result.pdfUrl);
      setGeneratedPdfPath(result.pdfPath);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  const handleDownload = async () => {
    if (!generatedPdfUrl) return;
    try {
      const res = await fetch(generatedPdfUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'manifest.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: 'Download blocked by browser',
        description: 'Opening the PDF in a new tab instead. Use your browser’s Save action to download.',
      });
      window.open(generatedPdfUrl, '_blank', 'noopener');
    }
  };

  const handleEmail = async () => {
    if (!generatedPdfPath) return;
    
    try {
      await sendEmail.mutateAsync({
        to: ['test@example.com'], // Replace with actual email
        subject: 'Manifest PDF',
        messageHtml: '<p>Please find the attached manifest PDF.</p>',
        pdfPath: generatedPdfPath,
      });
    } catch (error) {
      console.error('Email failed:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">AcroForm Manifest System</h1>
        <p className="text-muted-foreground">
          Generate state-compliant manifests using AcroForm PDF templates
        </p>
      </div>

      <Tabs defaultValue="state" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="state">State Compliance Data</TabsTrigger>
          <TabsTrigger value="business">Business/Pricing Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="state" className="space-y-4">
          <AcroFormManifestEditor 
            data={stateData} 
            onChange={setStateData}
          />
        </TabsContent>
        
        <TabsContent value="business" className="space-y-4">
          <BusinessDataEditor 
            data={businessData} 
            onChange={setBusinessData}
          />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Template Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertDescription>
              First, upload the AcroForm template to Supabase storage before generating manifests.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleUploadTemplate}
            disabled={isUploadingTemplate}
            variant="outline"
            className="w-full mb-4"
          >
            {isUploadingTemplate ? 'Uploading Template...' : 'Upload AcroForm Template'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate AcroForm Manifest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleGenerate}
            disabled={generateManifest.isPending}
            className="w-full"
          >
            {generateManifest.isPending ? 'Generating...' : 'Generate PDF Manifest'}
          </Button>
          
          {generatedPdfUrl && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <a href={generatedPdfUrl} target="_blank" rel="noopener">
                    Open PDF in new tab
                  </a>
                </Button>
                <Button 
                  onClick={handleDownload}
                  variant="outline"
                  className="flex-1"
                >
                  Download PDF
                </Button>
                <Button 
                  onClick={handleEmail}
                  disabled={sendEmail.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  {sendEmail.isPending ? 'Sending...' : 'Email PDF'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If Chrome blocks downloads in this preview, use “Open PDF in new tab”.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}