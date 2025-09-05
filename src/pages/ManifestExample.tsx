import React from 'react';
import ActualStateDocument from '@/components/ActualStateDocument';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const ManifestExample = () => {
  // This is real data from your manifests table
  const exampleManifestData = {
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
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
          <h1 className="text-3xl font-bold mb-2">Actual State Document Template</h1>
          <p className="text-lg text-muted-foreground">
            Real manifest data overlaid on the official Michigan state form exactly as it appears in the PDF
          </p>
        </div>
      </div>

      <ActualStateDocument data={exampleManifestData} />
      
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">✅ This is Real Data</h3>
        <p className="text-blue-700">
          This document shows actual data from your Supabase manifests table:
        </p>
        <ul className="list-disc list-inside mt-2 text-sm text-blue-600">
          <li>Manifest ID: 7b74cbbe-30a3-4c68-804b-da3eec154f18</li>
          <li>Customer & driver signatures captured and stored</li>
          <li>66 total tires processed across all categories</li>
          <li>Financial calculations with surcharges applied</li>
          <li>State-compliant document format ready for PDF generation</li>
        </ul>
      </div>
    </div>
  );
};

export default ManifestExample;