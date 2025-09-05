import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText } from 'lucide-react';

interface StateDocumentData {
  manifest_number: string;
  company_name: string;
  location_name: string;
  address: string;
  driver_name: string;
  vehicle_name: string;
  pte_off_rim: number;
  pte_on_rim: number;
  commercial_17_5_19_5_off: number;
  commercial_17_5_19_5_on: number;
  commercial_22_5_off: number;
  commercial_22_5_on: number;
  subtotal: number;
  surcharges: number;
  total: number;
  created_at: string;
  customer_signature_png_path?: string;
  driver_signature_png_path?: string;
}

interface StateDocumentPreviewProps {
  data: StateDocumentData;
}

export const StateDocumentPreview: React.FC<StateDocumentPreviewProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTotalTires = () => {
    return data.pte_off_rim + data.pte_on_rim + data.commercial_17_5_19_5_off + 
           data.commercial_17_5_19_5_on + data.commercial_22_5_off + data.commercial_22_5_on;
  };

  return (
    <Card className="max-w-4xl mx-auto bg-white border-2 border-gray-300">
      <CardHeader className="text-center border-b-2 border-gray-300 bg-gray-50">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FileText className="h-6 w-6" />
          <CardTitle className="text-2xl font-bold">STATE OF MICHIGAN</CardTitle>
        </div>
        <div className="text-lg font-semibold">TIRE RECYCLING MANIFEST</div>
        <div className="text-sm text-muted-foreground">Department of Environment, Great Lakes, and Energy</div>
      </CardHeader>
      
      <CardContent className="p-8 space-y-6">
        {/* Header Information */}
        <div className="grid grid-cols-2 gap-8 border-b pb-4">
          <div>
            <div className="text-sm font-semibold text-gray-600 mb-2">MANIFEST NUMBER</div>
            <div className="text-xl font-bold bg-yellow-100 p-2 border-2 border-yellow-300 rounded">
              {data.manifest_number}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-600 mb-2">DATE OF SERVICE</div>
            <div className="text-lg font-semibold p-2 border border-gray-300 rounded">
              {formatDate(data.created_at)}
            </div>
          </div>
        </div>

        {/* Service Information */}
        <div className="border-2 border-gray-300 p-4 rounded-lg bg-blue-50">
          <h3 className="text-lg font-bold mb-4 text-blue-800">SERVICE LOCATION INFORMATION</h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <span className="font-semibold">Business Name:</span>
              <span className="ml-2 bg-white px-2 py-1 border border-gray-300 rounded inline-block min-w-[300px]">
                {data.company_name}
              </span>
            </div>
            <div>
              <span className="font-semibold">Service Address:</span>
              <span className="ml-2 bg-white px-2 py-1 border border-gray-300 rounded inline-block min-w-[400px]">
                {data.address}
              </span>
            </div>
          </div>
        </div>

        {/* Transporter Information */}
        <div className="border-2 border-gray-300 p-4 rounded-lg bg-green-50">
          <h3 className="text-lg font-bold mb-4 text-green-800">TRANSPORTER INFORMATION</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-semibold">Driver Name:</span>
              <span className="ml-2 bg-white px-2 py-1 border border-gray-300 rounded inline-block min-w-[200px]">
                {data.driver_name}
              </span>
            </div>
            <div>
              <span className="font-semibold">Vehicle:</span>
              <span className="ml-2 bg-white px-2 py-1 border border-gray-300 rounded inline-block min-w-[200px]">
                {data.vehicle_name}
              </span>
            </div>
          </div>
        </div>

        {/* Tire Inventory */}
        <div className="border-2 border-red-300 p-4 rounded-lg bg-red-50">
          <h3 className="text-lg font-bold mb-4 text-red-800">TIRE INVENTORY & CLASSIFICATION</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="font-semibold text-sm text-gray-600 mb-2">PASSENGER TIRE EQUIVALENT (PTE)</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 border-2 border-gray-400 rounded">
                  <div className="text-xs font-semibold">OFF RIM</div>
                  <div className="text-2xl font-bold">{data.pte_off_rim}</div>
                </div>
                <div className="bg-white p-3 border-2 border-gray-400 rounded">
                  <div className="text-xs font-semibold">ON RIM</div>
                  <div className="text-2xl font-bold">{data.pte_on_rim}</div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="font-semibold text-sm text-gray-600 mb-2">COMMERCIAL 17.5" - 19.5"</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 border-2 border-gray-400 rounded">
                  <div className="text-xs font-semibold">OFF RIM</div>
                  <div className="text-2xl font-bold">{data.commercial_17_5_19_5_off}</div>
                </div>
                <div className="bg-white p-3 border-2 border-gray-400 rounded">
                  <div className="text-xs font-semibold">ON RIM</div>
                  <div className="text-2xl font-bold">{data.commercial_17_5_19_5_on}</div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="font-semibold text-sm text-gray-600 mb-2">COMMERCIAL 22.5"</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 border-2 border-gray-400 rounded">
                  <div className="text-xs font-semibold">OFF RIM</div>
                  <div className="text-2xl font-bold">{data.commercial_22_5_off}</div>
                </div>
                <div className="bg-white p-3 border-2 border-gray-400 rounded">
                  <div className="text-xs font-semibold">ON RIM</div>
                  <div className="text-2xl font-bold">{data.commercial_22_5_on}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <div className="bg-yellow-200 border-2 border-yellow-500 p-3 rounded-lg inline-block">
              <div className="text-sm font-semibold text-gray-700">TOTAL TIRES COLLECTED</div>
              <div className="text-3xl font-bold text-yellow-800">{getTotalTires()}</div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="border-2 border-purple-300 p-4 rounded-lg bg-purple-50">
          <h3 className="text-lg font-bold mb-4 text-purple-800">FINANCIAL SUMMARY</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Service Subtotal:</span>
              <span className="bg-white px-4 py-2 border border-gray-300 rounded font-mono text-lg">
                ${data.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Additional Surcharges:</span>
              <span className="bg-white px-4 py-2 border border-gray-300 rounded font-mono text-lg">
                ${data.surcharges.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center border-t-2 border-purple-400 pt-2">
              <span className="font-bold text-lg">TOTAL AMOUNT:</span>
              <span className="bg-purple-200 px-4 py-2 border-2 border-purple-500 rounded font-mono text-xl font-bold">
                ${data.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Signatures Section */}
        <div className="border-2 border-gray-600 p-4 rounded-lg bg-gray-50">
          <h3 className="text-lg font-bold mb-4">CERTIFICATION & SIGNATURES</h3>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-2 border-gray-400 p-4 h-32 mb-2 bg-white rounded flex items-center justify-center">
                {data.customer_signature_png_path ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-6 w-6" />
                    <span className="font-semibold">CUSTOMER SIGNED</span>
                  </div>
                ) : (
                  <span className="text-gray-500">Customer Signature Required</span>
                )}
              </div>
              <div className="text-sm font-semibold">CUSTOMER SIGNATURE</div>
              <div className="text-xs text-gray-600 mt-1">
                I certify that the tire count above is accurate<br/>
                and that all tires were legally disposed of.
              </div>
            </div>
            
            <div className="text-center">
              <div className="border-2 border-gray-400 p-4 h-32 mb-2 bg-white rounded flex items-center justify-center">
                {data.driver_signature_png_path ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-6 w-6" />
                    <span className="font-semibold">DRIVER SIGNED</span>
                  </div>
                ) : (
                  <span className="text-gray-500">Driver Signature Required</span>
                )}
              </div>
              <div className="text-sm font-semibold">TRANSPORTER SIGNATURE</div>
              <div className="text-xs text-gray-600 mt-1">
                I certify that I have collected the tires<br/>
                listed above for proper recycling.
              </div>
            </div>
          </div>
        </div>

        {/* Document Status */}
        <div className="text-center mt-6">
          {data.customer_signature_png_path && data.driver_signature_png_path ? (
            <Badge className="bg-green-100 text-green-800 text-lg px-6 py-2">
              ✓ DOCUMENT COMPLETE - READY FOR STATE SUBMISSION
            </Badge>
          ) : (
            <Badge variant="outline" className="text-lg px-6 py-2">
              SIGNATURES REQUIRED FOR COMPLETION
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 border-t pt-4">
          This manifest serves as official documentation for tire recycling activities in accordance with Michigan Environmental Regulations.
          <br/>
          Generated on {formatDate(data.created_at)} | Manifest #{data.manifest_number}
        </div>
      </CardContent>
    </Card>
  );
};

export default StateDocumentPreview;