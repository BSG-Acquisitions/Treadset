import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ManifestWizard } from '@/components/driver/ManifestWizard';
import { useCreateManifest, useManifests } from '@/hooks/useManifests';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Truck, FileText, CheckCircle, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export const ManifestDemo = () => {
  const [demoManifestId, setDemoManifestId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const createManifest = useCreateManifest();
  const { data: manifests } = useManifests();

  // Sample demo data
  const demoPickup = {
    id: '5645b364-ff59-4b84-94e4-6c09379f81fd',
    client_name: '13 and Crooks Auto Care',
    location_name: '3224 Crooks Rd., Royal Oak, MI 48073',
    pickup_date: '2025-09-05'
  };

  const createDemoManifest = async () => {
    setIsCreating(true);
    try {
      // Get organization and user data
      const { data: user } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.user?.id)
        .single();

      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();

      // Create manifest
      const manifestData = {
        client_id: 'cac51b93-691d-4d95-bd76-9fb558486cac',
        location_id: 'cffbdad5-b56e-45ba-af4c-1675c56456d0',
        pickup_id: '5645b364-ff59-4b84-94e4-6c09379f81fd',
        driver_id: userData?.id,
        vehicle_id: vehicle?.id,
        pte_off_rim: 0,
        pte_on_rim: 0,
        commercial_17_5_19_5_off: 0,
        commercial_17_5_19_5_on: 0,
        commercial_22_5_off: 0,
        commercial_22_5_on: 0
      };

      const result = await createManifest.mutateAsync(manifestData);
      setDemoManifestId(result.id);
      
      toast({
        title: "Demo manifest created!",
        description: "Now you can test the complete workflow",
      });
    } catch (error) {
      toast({
        title: "Error creating manifest",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const recentManifests = manifests?.slice(0, 5) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-3xl font-bold">Manifest System Demo</h1>
        <p className="text-lg text-muted-foreground">
          Complete digital manifest workflow with PDF generation and email delivery
        </p>
      </motion.div>

      {/* Demo Workflow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Truck className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <h3 className="font-semibold">1. Create Manifest</h3>
              <p className="text-sm text-muted-foreground">Assign pickup to driver & vehicle</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <h3 className="font-semibold">2. Capture Data</h3>
              <p className="text-sm text-muted-foreground">Tire counts, photos, signatures</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <h3 className="font-semibold">3. Generate PDF</h3>
              <p className="text-sm text-muted-foreground">State-compliant manifest PDF</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Send className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <h3 className="font-semibold">4. Email Client</h3>
              <p className="text-sm text-muted-foreground">Automatic delivery to client</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Demo Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demo Manifest Creation */}
        <Card>
          <CardHeader>
            <CardTitle>Demo Manifest Creation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Sample Pickup:</h4>
              <p className="text-sm"><strong>Client:</strong> {demoPickup.client_name}</p>
              <p className="text-sm"><strong>Location:</strong> {demoPickup.location_name}</p>
              <p className="text-sm"><strong>Date:</strong> {demoPickup.pickup_date}</p>
            </div>
            
            <Button 
              onClick={createDemoManifest} 
              disabled={isCreating || !!demoManifestId}
              className="w-full"
            >
              {isCreating ? 'Creating...' : demoManifestId ? 'Demo Manifest Created ✓' : 'Create Demo Manifest'}
            </Button>

            {demoManifestId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-50 border border-green-200 rounded-lg"
              >
                <p className="text-sm text-green-800">
                  ✓ Demo manifest created! ID: <code className="text-xs">{demoManifestId.slice(-8)}</code>
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Recent Manifests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Manifests</CardTitle>
          </CardHeader>
          <CardContent>
            {recentManifests.length > 0 ? (
              <div className="space-y-2">
                {recentManifests.map((manifest) => (
                  <div key={manifest.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{manifest.manifest_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {manifest.client?.company_name || 'Unknown Client'}
                      </p>
                    </div>
                    <Badge variant={
                      manifest.status === 'COMPLETED' ? 'default' : 
                      manifest.status === 'IN_PROGRESS' ? 'secondary' : 'outline'
                    }>
                      {manifest.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No manifests yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manifest Wizard Demo */}
      {demoManifestId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card>
            <CardHeader>
              <CardTitle>Driver Interface Demo</CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete the manifest workflow: arrival → tire counts → photos → signatures → finalization
              </p>
            </CardHeader>
            <CardContent>
              <ManifestWizard 
                manifestId={demoManifestId} 
                onComplete={() => {
                  toast({
                    title: "Manifest completed!",
                    description: "PDF generated and emailed to client",
                  });
                  setDemoManifestId(null);
                }}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>System Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">PDF Generation</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Overlay data onto state-compliant template</li>
                <li>Embed digital signatures</li>
                <li>Generate unique manifest numbers</li>
                <li>SHA-256 hash verification</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Offline Support</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Queue operations when offline</li>
                <li>Auto-sync when connection restored</li>
                <li>Local signature storage</li>
                <li>Progressive web app capabilities</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Email Delivery</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Automatic client notification</li>
                <li>Secure PDF download links</li>
                <li>Custom email templates</li>
                <li>Delivery confirmation</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Security & Compliance</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Row-level security policies</li>
                <li>Digital signature validation</li>
                <li>Audit trail maintenance</li>
                <li>State regulation compliance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManifestDemo;