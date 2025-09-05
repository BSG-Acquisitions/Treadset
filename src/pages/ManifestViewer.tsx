import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Send, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StateDocumentPreview from '@/components/StateDocumentPreview';

interface Manifest {
  id: string;
  manifest_number: string;
  status: string;
  client_id: string;
  driver_id: string;
  vehicle_id: string;
  location_id: string;
  pte_off_rim: number;
  pte_on_rim: number;
  commercial_17_5_19_5_off: number;
  commercial_17_5_19_5_on: number;
  commercial_22_5_off: number;
  commercial_22_5_on: number;
  subtotal: number;
  surcharges: number;
  total: number;
  customer_signature_png_path?: string;
  driver_signature_png_path?: string;
  pdf_path?: string;
  signed_at?: string;
  created_at: string;
}

export const ManifestViewer = () => {
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState<string | null>(null);
  const [selectedManifest, setSelectedManifest] = useState<any>(null);
  const [showDocument, setShowDocument] = useState(false);

  useEffect(() => {
    loadManifests();
  }, []);

  const loadManifests = async () => {
    try {
      // First get the manifests
      const { data: manifestsData, error: manifestsError } = await supabase
        .from('manifests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (manifestsError) throw manifestsError;

      if (!manifestsData || manifestsData.length === 0) {
        setManifests([]);
        return;
      }

      // Get unique IDs for related data
      const clientIds = [...new Set(manifestsData.map(m => m.client_id).filter(Boolean))];
      const locationIds = [...new Set(manifestsData.map(m => m.location_id).filter(Boolean))];
      const driverIds = [...new Set(manifestsData.map(m => m.driver_id).filter(Boolean))];
      const vehicleIds = [...new Set(manifestsData.map(m => m.vehicle_id).filter(Boolean))];

      // Fetch related data in parallel
      const [clientsResult, locationsResult, driversResult, vehiclesResult] = await Promise.all([
        clientIds.length > 0 ? supabase.from('clients').select('id, company_name, email').in('id', clientIds) : { data: [] },
        locationIds.length > 0 ? supabase.from('locations').select('id, address, name').in('id', locationIds) : { data: [] },
        driverIds.length > 0 ? supabase.from('users').select('id, first_name, last_name').in('id', driverIds) : { data: [] },
        vehicleIds.length > 0 ? supabase.from('vehicles').select('id, name').in('id', vehicleIds) : { data: [] },
      ]);

      // Create lookup maps
      const clientsMap = new Map();
      const locationsMap = new Map();
      const driversMap = new Map();
      const vehiclesMap = new Map();

      // Populate maps if data exists
      if (clientsResult.data) {
        clientsResult.data.forEach(c => clientsMap.set(c.id, c));
      }
      if (locationsResult.data) {
        locationsResult.data.forEach(l => locationsMap.set(l.id, l));
      }
      if (driversResult.data) {
        driversResult.data.forEach(u => driversMap.set(u.id, u));
      }
      if (vehiclesResult.data) {
        vehiclesResult.data.forEach(v => vehiclesMap.set(v.id, v));
      }

      // Combine the data
      const enrichedManifests = manifestsData.map(manifest => ({
        ...manifest,
        clients: clientsMap.get(manifest.client_id) || null,
        locations: locationsMap.get(manifest.location_id) || null,
        users: driversMap.get(manifest.driver_id) || null,
        vehicles: vehiclesMap.get(manifest.vehicle_id) || null,
      }));

      setManifests(enrichedManifests);
    } catch (error) {
      console.error('Error loading manifests:', error);
      toast.error('Failed to load manifests');
    } finally {
      setLoading(false);
    }
  };

  const finalizeManifest = async (manifestId: string) => {
    setFinalizing(manifestId);
    try {
      const { data, error } = await supabase.functions.invoke('manifest-finalize', {
        body: { manifest_id: manifestId }
      });

      if (error) throw error;

      toast.success('Manifest finalized successfully!');
      
      // Reload manifests to show updated data
      await loadManifests();
      
      // Show the PDF if available
      if (data?.pdf_signed_url) {
        window.open(data.pdf_signed_url, '_blank');
      }
    } catch (error) {
      console.error('Error finalizing manifest:', error);
      toast.error('Failed to finalize manifest');
    } finally {
      setFinalizing(null);
    }
  };

  const viewPDF = async (manifestId: string) => {
    try {
      const manifest = manifests.find(m => m.id === manifestId);
      if (!manifest?.pdf_path) {
        toast.error('PDF not yet generated');
        return;
      }

      // Get signed URL for the PDF
      const { data, error } = await supabase.storage
        .from('manifests')
        .createSignedUrl(manifest.pdf_path, 3600); // 1 hour expiry

      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing PDF:', error);
      toast.error('Failed to view PDF');
    }
  };

  const getTotalTires = (manifest: Manifest) => {
    return (
      manifest.pte_off_rim +
      manifest.pte_on_rim +
      manifest.commercial_17_5_19_5_off +
      manifest.commercial_17_5_19_5_on +
      manifest.commercial_22_5_off +
      manifest.commercial_22_5_on
    );
  };

  const getStatusBadge = (manifest: Manifest) => {
    if (manifest.pdf_path && manifest.signed_at) {
      return <Badge variant="default" className="bg-green-100 text-green-800">✓ Completed</Badge>;
    }
    if (manifest.customer_signature_png_path && manifest.driver_signature_png_path) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Ready to Finalize</Badge>;
    }
    return <Badge variant="outline">In Progress</Badge>;
  };

  const showStateDocument = (manifest: any) => {
    const documentData = {
      manifest_number: manifest.manifest_number,
      company_name: manifest.clients?.company_name || 'Unknown Company',
      location_name: manifest.locations?.name || 'Unknown Location',
      address: manifest.locations?.address || 'Unknown Address',
      driver_name: manifest.users ? `${manifest.users.first_name} ${manifest.users.last_name}` : 'Unknown Driver',
      vehicle_name: manifest.vehicles?.name || 'Unknown Vehicle',
      pte_off_rim: manifest.pte_off_rim,
      pte_on_rim: manifest.pte_on_rim,
      commercial_17_5_19_5_off: manifest.commercial_17_5_19_5_off,
      commercial_17_5_19_5_on: manifest.commercial_17_5_19_5_on,
      commercial_22_5_off: manifest.commercial_22_5_off,
      commercial_22_5_on: manifest.commercial_22_5_on,
      subtotal: manifest.subtotal,
      surcharges: manifest.surcharges,
      total: manifest.total,
      created_at: manifest.created_at,
      customer_signature_png_path: manifest.customer_signature_png_path,
      driver_signature_png_path: manifest.driver_signature_png_path,
    };
    setSelectedManifest(documentData);
    setShowDocument(true);
  };

  if (showDocument && selectedManifest) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <button 
            onClick={() => setShowDocument(false)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Manifest List
          </button>
        </div>
        <StateDocumentPreview data={selectedManifest} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading manifests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold">Live Manifest System</h1>
        <p className="text-xl text-muted-foreground">
          Real tire recycling manifests with signatures and state-compliant PDFs
        </p>
      </div>

      {manifests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Manifests Found</h3>
            <p className="text-muted-foreground">Create a manifest from the driver interface to see it here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {manifests.map((manifest) => (
            <Card key={manifest.id} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Manifest #{manifest.manifest_number}
                  </CardTitle>
                  {getStatusBadge(manifest)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Manifest Details */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Manifest Details</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Total Tires:</strong> {getTotalTires(manifest)}</div>
                      <div><strong>PTE Off Rim:</strong> {manifest.pte_off_rim}</div>
                      <div><strong>PTE On Rim:</strong> {manifest.pte_on_rim}</div>
                      <div><strong>17.5-19.5 Off:</strong> {manifest.commercial_17_5_19_5_off}</div>
                      <div><strong>17.5-19.5 On:</strong> {manifest.commercial_17_5_19_5_on}</div>
                      <div><strong>22.5 Off:</strong> {manifest.commercial_22_5_off}</div>
                      <div><strong>22.5 On:</strong> {manifest.commercial_22_5_on}</div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Financial Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${manifest.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Surcharges:</span>
                        <span>${manifest.surcharges.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>${manifest.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Status & Actions</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {manifest.customer_signature_png_path ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2" />
                        )}
                        <span>Customer Signature</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {manifest.driver_signature_png_path ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2" />
                        )}
                        <span>Driver Signature</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {manifest.pdf_path ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2" />
                        )}
                        <span>PDF Generated</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3">
                      <Button 
                        onClick={() => showStateDocument(manifest)}
                        variant="outline"
                        className="w-full"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View State Document
                      </Button>
                      
                      {manifest.pdf_path ? (
                        <Button 
                          onClick={() => viewPDF(manifest.id)}
                          className="w-full"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Signed PDF
                        </Button>
                      ) : manifest.customer_signature_png_path && manifest.driver_signature_png_path ? (
                        <Button 
                          onClick={() => finalizeManifest(manifest.id)}
                          disabled={finalizing === manifest.id}
                          className="w-full"
                        >
                          {finalizing === manifest.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating PDF...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Generate State PDF
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button disabled className="w-full">
                          Waiting for Signatures
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManifestViewer;