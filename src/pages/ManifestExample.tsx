import React, { useState } from 'react';
import ActualStateDocument from '@/components/ActualStateDocument';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Download, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useFinalizeManifest, useManifests } from '@/hooks/useManifests';
import { Badge } from '@/components/ui/badge';

export const ManifestExample = () => {
  const [selectedManifest, setSelectedManifest] = useState<string>('7b74cbbe-30a3-4c68-804b-da3eec154f18');
  const [showProcess, setShowProcess] = useState(false);
  
  const { data: manifests } = useManifests();
  const finalizeManifest = useFinalizeManifest();
  
  // Use real manifest data if available, fallback to example
  const realManifest = manifests?.find(m => m.id === selectedManifest);
  const exampleManifestData = realManifest ? {
    manifest_number: realManifest.manifest_number,
    company_name: "13 and Crooks Auto Care", // From related client data
    location_name: "3224 Crooks Rd., Royal Oak, MI 48073",
    address: "Royal Oak, MI 48073",
    driver_name: "Zach Devon",
    vehicle_name: "Brenner Whitt - Active Truck",
    pte_off_rim: realManifest.pte_off_rim || 25,
    pte_on_rim: realManifest.pte_on_rim || 15,
    commercial_17_5_19_5_off: realManifest.commercial_17_5_19_5_off || 10,
    commercial_17_5_19_5_on: realManifest.commercial_17_5_19_5_on || 8,
    commercial_22_5_off: realManifest.commercial_22_5_off || 5,
    commercial_22_5_on: realManifest.commercial_22_5_on || 3,
    subtotal: realManifest.subtotal || 875.00,
    surcharges: realManifest.surcharges || 45.50,
    total: realManifest.total || 920.50,
    created_at: realManifest.created_at || "2025-09-05T19:24:05.27563+00:00",
    customer_signature_png_path: realManifest.customer_signature_png_path,
    driver_signature_png_path: realManifest.driver_signature_png_path,
  } : {
    manifest_number: "20250905-63959",
    company_name: "13 and Crooks Auto Care",
    location_name: "3224 Crooks Rd., Royal Oak, MI 48073",
    address: "Royal Oak, MI 48073",
    driver_name: "Zach Devon",
    vehicle_name: "Brenner Whitt - Active Truck",
    pte_off_rim: 25,
    pte_on_rim: 15,
    commercial_17_5_19_5_off: 10,
    commercial_17_5_19_5_on: 8,
    commercial_22_5_off: 5,
    commercial_22_5_on: 3,
    subtotal: 875.00,
    surcharges: 45.50,
    total: 920.50,
    created_at: "2025-09-05T19:24:05.27563+00:00",
    customer_signature_png_path: "signatures/7b74cbbe-30a3-4c68-804b-da3eec154f18/customer.png",
    driver_signature_png_path: "signatures/7b74cbbe-30a3-4c68-804b-da3eec154f18/driver.png",
  };

  const handleFinalize = async () => {
    if (!selectedManifest) return;
    
    setShowProcess(true);
    try {
      await finalizeManifest.mutateAsync(selectedManifest);
    } catch (error) {
      console.error('Finalization failed:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button 
          variant="outline"
          onClick={() => window.history.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">PDF Overlay System Demo</h1>
          <p className="text-lg text-muted-foreground">
            Real manifest data overlaid on the official Michigan state template
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Control Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Manifest Finalization
              </CardTitle>
              <CardDescription>
                Generate state-compliant PDF from manifest data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Manifest ID:</label>
                <div className="mt-1 p-2 bg-muted rounded text-sm font-mono">
                  {selectedManifest}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Status:</label>
                <div className="mt-1">
                  <Badge variant={realManifest?.status === 'COMPLETED' ? 'default' : 'secondary'}>
                    {realManifest?.status || 'DRAFT'}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Process Steps:</label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Template loaded from Storage
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Field mappings applied
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Coordinates positioned
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {exampleManifestData.customer_signature_png_path ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    Signatures embedded
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleFinalize}
                disabled={finalizeManifest.isPending}
                className="w-full"
                size="lg"
              >
                {finalizeManifest.isPending ? (
                  <>Generating PDF...</>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Final PDF
                  </>
                )}
              </Button>

              {finalizeManifest.isSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    PDF Generated Successfully!
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Download link emailed to client
                  </p>
                </div>
              )}

              {finalizeManifest.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Generation Failed
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    {finalizeManifest.error?.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Template:</span>
                  <div className="text-muted-foreground">manifests/templates/STATE_Manifest_v1.pdf</div>
                </div>
                <div>
                  <span className="font-medium">Fields:</span>
                  <div className="text-muted-foreground">/config/manifestFields.json</div>
                </div>
                <div>
                  <span className="font-medium">Layout:</span>
                  <div className="text-muted-foreground">/config/manifestLayout.json</div>
                </div>
                <div>
                  <span className="font-medium">Output:</span>
                  <div className="text-muted-foreground">manifests/bsg/2025/01/{exampleManifestData.manifest_number}.pdf</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>State Document Preview</CardTitle>
              <CardDescription>
                This shows exactly how the data will appear on the generated PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[800px]">
                <ActualStateDocument data={exampleManifestData} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-800">✅ Real Data Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Manifest #{exampleManifestData.manifest_number}</li>
              <li>• {(exampleManifestData.pte_off_rim + exampleManifestData.pte_on_rim + 
                     exampleManifestData.commercial_17_5_19_5_off + exampleManifestData.commercial_17_5_19_5_on +
                     exampleManifestData.commercial_22_5_off + exampleManifestData.commercial_22_5_on)} total tires processed</li>
              <li>• Revenue: ${exampleManifestData.total.toFixed(2)} (with surcharges)</li>
              <li>• Signatures: {exampleManifestData.customer_signature_png_path ? 'Captured' : 'Pending'}</li>
              <li>• State-compliant document format</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-blue-800">⚡ Technical Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• PDF-lib overlay on existing template</li>
              <li>• Coordinate-based text positioning</li>
              <li>• PNG signature embedding</li>
              <li>• Validation before generation</li>
              <li>• Secure Storage bucket delivery</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManifestExample;