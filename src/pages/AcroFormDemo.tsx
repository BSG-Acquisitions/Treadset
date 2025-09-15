import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AcroFormManifestEditor } from '@/components/manifest/AcroFormManifestEditor';
import { BusinessDataEditor } from '@/components/manifest/BusinessDataEditor';
import { useGenerateAcroFormManifest, convertToAcroFormFields } from '@/hooks/useAcroFormManifest';
import { AcroFormManifestData, ManifestBusinessData } from '@/types/acroform-manifest';

export default function AcroFormDemo() {
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

  const handleGenerate = async () => {
    const acroFormFields = convertToAcroFormFields(stateData);
    
    await generateManifest.mutateAsync({
      templatePath: 'Michigan_Manifest_AcroForm.pdf',
      manifestData: acroFormFields,
      outputPath: `manifests/demo-${Date.now()}.pdf`
    });
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
          <CardTitle>Generate AcroForm Manifest</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleGenerate}
            disabled={generateManifest.isPending}
            className="w-full"
          >
            {generateManifest.isPending ? 'Generating...' : 'Generate PDF Manifest'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}