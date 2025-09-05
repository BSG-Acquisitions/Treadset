import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

interface ActualStateDocumentProps {
  data: {
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
  };
}

export const ActualStateDocument: React.FC<ActualStateDocumentProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white border-2 border-gray-800" style={{ width: '8.5in', minHeight: '11in', margin: '0 auto', position: 'relative', fontSize: '10px', fontFamily: 'Arial, sans-serif' }}>
      {/* State Header */}
      <div className="text-center p-4 border-b-2 border-gray-800 bg-gray-100">
        <div className="text-xl font-bold">STATE OF MICHIGAN</div>
        <div className="text-lg font-semibold">DEPARTMENT OF ENVIRONMENT, GREAT LAKES, AND ENERGY</div>
        <div className="text-base font-medium mt-2">WASTE TIRE RECYCLING MANIFEST</div>
        <div className="text-sm mt-1">Form WM-RT-001 (Rev. 2024)</div>
      </div>

      {/* Document positioned exactly like the PDF template */}
      <div style={{ position: 'relative', height: '10in', padding: '20px' }}>
        
        {/* Manifest Number - Top Right */}
        <div style={{ position: 'absolute', left: '460px', top: '30px', fontSize: '10px', fontWeight: 'bold' }}>
          MANIFEST #: {data.manifest_number}
        </div>

        {/* Date - Top Right */}
        <div style={{ position: 'absolute', left: '460px', top: '48px', fontSize: '10px' }}>
          DATE: {formatDate(data.created_at)}
        </div>

        {/* Generator Information Section */}
        <div style={{ position: 'absolute', left: '20px', top: '80px', fontSize: '10px' }}>
          <div className="font-bold mb-2">GENERATOR INFORMATION:</div>
          
          {/* Client Name */}
          <div style={{ marginBottom: '8px' }}>
            <span className="font-semibold">Business Name: </span>
            <span className="bg-yellow-100 px-1">{data.company_name}</span>
          </div>
          
          {/* Service Address */}
          <div style={{ marginBottom: '8px' }}>
            <span className="font-semibold">Service Address: </span>
            <span className="bg-yellow-100 px-1">{data.address}</span>
          </div>
        </div>

        {/* Transporter Information */}
        <div style={{ position: 'absolute', left: '20px', top: '180px', fontSize: '10px' }}>
          <div className="font-bold mb-2">TRANSPORTER INFORMATION:</div>
          
          {/* Driver Name */}
          <div style={{ position: 'absolute', left: '0px', top: '25px' }}>
            <span className="font-semibold">Driver: </span>
            <span className="bg-blue-100 px-1">{data.driver_name}</span>
          </div>
          
          {/* Vehicle */}
          <div style={{ position: 'absolute', left: '200px', top: '25px' }}>
            <span className="font-semibold">Vehicle: </span>
            <span className="bg-blue-100 px-1">{data.vehicle_name}</span>
          </div>
        </div>

        {/* Tire Count Section - This is the main table */}
        <div style={{ position: 'absolute', left: '20px', top: '280px', fontSize: '10px' }}>
          <div className="font-bold mb-3">TIRE INVENTORY BY CATEGORY:</div>
          
          {/* Table Header */}
          <div className="border border-gray-600 bg-gray-200 p-2 text-center font-bold" style={{ width: '520px' }}>
            PASSENGER TIRE EQUIVALENT (PTE) AND COMMERCIAL TIRE COUNTS
          </div>
          
          {/* Tire Count Grid - Positioned exactly like PDF */}
          <div style={{ border: '1px solid #666', width: '520px', height: '120px', position: 'relative', backgroundColor: 'white' }}>
            
            {/* PTE Off Rim */}
            <div style={{ position: 'absolute', left: '70px', top: '40px', textAlign: 'center' }}>
              <div className="text-xs font-semibold">PTE OFF RIM</div>
              <div className="text-2xl font-bold bg-green-100 border-2 border-green-500 px-2 py-1 mt-1">
                {data.pte_off_rim}
              </div>
            </div>

            {/* PTE On Rim */}
            <div style={{ position: 'absolute', left: '140px', top: '40px', textAlign: 'center' }}>
              <div className="text-xs font-semibold">PTE ON RIM</div>
              <div className="text-2xl font-bold bg-green-100 border-2 border-green-500 px-2 py-1 mt-1">
                {data.pte_on_rim}
              </div>
            </div>

            {/* 17.5-19.5 Off */}
            <div style={{ position: 'absolute', left: '210px', top: '40px', textAlign: 'center' }}>
              <div className="text-xs font-semibold">17.5-19.5 OFF</div>
              <div className="text-2xl font-bold bg-orange-100 border-2 border-orange-500 px-2 py-1 mt-1">
                {data.commercial_17_5_19_5_off}
              </div>
            </div>

            {/* 17.5-19.5 On */}
            <div style={{ position: 'absolute', left: '280px', top: '40px', textAlign: 'center' }}>
              <div className="text-xs font-semibold">17.5-19.5 ON</div>
              <div className="text-2xl font-bold bg-orange-100 border-2 border-orange-500 px-2 py-1 mt-1">
                {data.commercial_17_5_19_5_on}
              </div>
            </div>

            {/* 22.5 Off */}
            <div style={{ position: 'absolute', left: '350px', top: '40px', textAlign: 'center' }}>
              <div className="text-xs font-semibold">22.5 OFF</div>
              <div className="text-2xl font-bold bg-red-100 border-2 border-red-500 px-2 py-1 mt-1">
                {data.commercial_22_5_off}
              </div>
            </div>

            {/* 22.5 On */}
            <div style={{ position: 'absolute', left: '420px', top: '40px', textAlign: 'center' }}>
              <div className="text-xs font-semibold">22.5 ON</div>
              <div className="text-2xl font-bold bg-red-100 border-2 border-red-500 px-2 py-1 mt-1">
                {data.commercial_22_5_on}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Section - Bottom Right like PDF */}
        <div style={{ position: 'absolute', right: '40px', top: '550px', fontSize: '10px', textAlign: 'right' }}>
          <div className="font-bold mb-2">FINANCIAL SUMMARY:</div>
          
          <div style={{ marginBottom: '4px' }}>
            <span>Subtotal: </span>
            <span className="bg-yellow-100 px-2 py-1 font-mono">${data.subtotal.toFixed(2)}</span>
          </div>
          
          <div style={{ marginBottom: '4px' }}>
            <span>Surcharges: </span>
            <span className="bg-yellow-100 px-2 py-1 font-mono">${data.surcharges.toFixed(2)}</span>
          </div>
          
          <div className="border-t-2 border-gray-600 pt-2">
            <span className="font-bold">TOTAL: </span>
            <span className="bg-green-200 border-2 border-green-600 px-3 py-1 font-mono font-bold text-lg">
              ${data.total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Signature Section - Bottom */}
        <div style={{ position: 'absolute', left: '20px', bottom: '80px', fontSize: '10px' }}>
          <div className="font-bold mb-3">CERTIFICATION AND SIGNATURES:</div>
          
          <div style={{ display: 'flex', gap: '100px' }}>
            {/* Customer Signature */}
            <div>
              <div className="border-2 border-gray-600 bg-gray-50" style={{ width: '200px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {data.customer_signature_png_path ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-bold">CUSTOMER SIGNED</span>
                  </div>
                ) : (
                  <span className="text-gray-400">Customer Signature</span>
                )}
              </div>
              <div className="text-center mt-1 font-semibold">CUSTOMER SIGNATURE</div>
              <div className="text-center text-xs">Date: {formatDate(data.created_at)}</div>
            </div>

            {/* Driver Signature */}
            <div>
              <div className="border-2 border-gray-600 bg-gray-50" style={{ width: '200px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {data.driver_signature_png_path ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-bold">DRIVER SIGNED</span>
                  </div>
                ) : (
                  <span className="text-gray-400">Driver Signature</span>
                )}
              </div>
              <div className="text-center mt-1 font-semibold">TRANSPORTER SIGNATURE</div>
              <div className="text-center text-xs">Date: {formatDate(data.created_at)}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', textAlign: 'center', fontSize: '8px', color: '#666' }}>
          This manifest serves as official documentation for waste tire collection and recycling activities in accordance with Michigan Environmental Protection Act.
        </div>
      </div>
    </div>
  );
};

export default ActualStateDocument;