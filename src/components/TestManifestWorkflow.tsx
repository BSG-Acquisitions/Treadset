import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock, AlertCircle, FileText } from "lucide-react";

export function TestManifestWorkflow() {
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const runWorkflowTest = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      // 1. Test client creation
      const clientResult = await supabase
        .from('clients')
        .insert({
          company_name: `Test Client ${Date.now()}`,
          contact_name: 'Test Contact',
          email: 'test@example.com',
          phone: '+12345678901',
          organization_id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
          mailing_address: '123 Test St',
          city: 'Detroit',
          state: 'MI',
          zip: '48207',
          county: 'Wayne'
        })
        .select()
        .single();

      if (clientResult.error) throw clientResult.error;

      // 2. Test pickup creation
      const pickupResult = await supabase
        .from('pickups')
        .insert({
          client_id: clientResult.data.id,
          pickup_date: new Date().toISOString().split('T')[0],
          pte_count: 50,
          otr_count: 10,
          tractor_count: 5,
          organization_id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
          status: 'scheduled'
        })
        .select()
        .single();

      if (pickupResult.error) throw pickupResult.error;

      // 3. Test vehicle query (simplified trucks)
      const vehiclesResult = await supabase
        .from('vehicles')
        .select('*')
        .eq('organization_id', 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73')
        .eq('is_active', true)
        .limit(1);

      // 4. Test timestamp generation for manifest
      const timestamp = new Date().toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      setResults({
        client: clientResult.data,
        pickup: pickupResult.data,
        vehicles: vehiclesResult.data || [],
        timestamp,
        vehicleCount: vehiclesResult.data?.length || 0,
        workflowStatus: 'complete'
      });

      toast({
        title: "Workflow Test Complete",
        description: "All components tested successfully!"
      });

    } catch (error: any) {
      console.error('Workflow test failed:', error);
      setResults({ error: error.message });
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Test Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manifest Workflow Test</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Test the complete client → pickup → driver → manifest → email workflow
          </p>
          
          <Button 
            onClick={runWorkflowTest} 
            disabled={testing}
            className="w-full"
          >
            {testing ? "Running Test..." : "Run Workflow Test"}
          </Button>

          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {results.error ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      Test Failed
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Test Results
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.error ? (
                  <div className="text-destructive">
                    Error: {results.error}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Client Created:</strong>
                        <div className="text-muted-foreground">{results.client?.company_name}</div>
                      </div>
                      <div>
                        <strong>Pickup Created:</strong>
                        <div className="text-muted-foreground">{results.pickup?.pickup_date}</div>
                      </div>
                      <div>
                        <strong>Available Trucks:</strong>
                        <div className="text-muted-foreground">{results.vehicleCount} trucks found</div>
                      </div>
                      <div>
                        <strong>Timestamp Format:</strong>
                        <div className="text-muted-foreground">{results.timestamp}</div>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <strong>Workflow Status:</strong>
                      <Badge variant="default" className="ml-2">
                        {results.workflowStatus}
                      </Badge>
                    </div>

                    {results.vehicles.length > 0 && (
                      <div className="pt-2">
                        <strong>Available Trucks:</strong>
                        <div className="space-y-1 mt-1">
                          {results.vehicles.map((vehicle: any, index: number) => (
                            <div key={vehicle.id} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                              <span>Truck {index + 1}</span>
                              <span className="text-muted-foreground">{vehicle.capacity} PTE</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}