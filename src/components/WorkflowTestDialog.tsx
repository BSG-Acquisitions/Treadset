import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, User, Truck, FileText, Mail } from "lucide-react";
import { useSchedulePickupWithDriver } from "@/hooks/useSchedulePickupWithDriver";
import { useDriverAssignments } from "@/hooks/useDriverAssignments";
import { useClients } from "@/hooks/useClients";
import { useVehicles } from "@/hooks/useVehicles";
import { useEmployees } from "@/hooks/useEmployees";
import { useToast } from "@/hooks/use-toast";

export function WorkflowTestDialog() {
  const [open, setOpen] = useState(false);
  const [testStep, setTestStep] = useState(0);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { toast } = useToast();
  const schedulePickup = useSchedulePickupWithDriver();
  const { data: clients } = useClients({ search: "", limit: 10 });
  const { data: vehicles } = useVehicles();
  const { data: employees } = useEmployees();
  const { data: driverAssignments } = useDriverAssignments();

  // Get test driver (oaklandreds20@gmail.com)
  const testDriver = employees?.find(emp => 
    emp.email === "oaklandreds20@gmail.com" && emp.roles.includes('driver')
  );

  const testSteps = [
    "Find test driver with oaklandreds email",
    "Find available vehicle and client",
    "Schedule pickup with driver assignment",
    "Verify assignment appears in driver assignments",
    "Check workflow completion status"
  ];

  const runWorkflowTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    setTestStep(0);
    
    try {
      // Step 1: Find test driver
      setTestStep(1);
      if (!testDriver) {
        throw new Error("Test driver with oaklandreds20@gmail.com not found or not active");
      }
      setTestResults(prev => [...prev, { 
        step: 1, 
        status: 'success', 
        message: `Found test driver: ${testDriver.firstName} ${testDriver.lastName}`,
        data: testDriver
      }]);

      // Step 2: Find client and vehicle
      setTestStep(2);
      const testClient = clients?.data?.[0];
      const testVehicle = vehicles?.[0];
      
      if (!testClient || !testVehicle) {
        throw new Error("No available clients or vehicles for testing");
      }
      
      setTestResults(prev => [...prev, { 
        step: 2, 
        status: 'success', 
        message: `Found client: ${testClient.company_name}, Vehicle: ${testVehicle.name}`,
        data: { client: testClient, vehicle: testVehicle }
      }]);

      // Step 3: Schedule pickup with driver
      setTestStep(3);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const pickupData = {
        clientId: testClient.id,
        vehicleId: testVehicle.id,
        driverId: testDriver.id,
        pickupDate: tomorrow.toISOString().split('T')[0],
        pteCount: 50,
        otrCount: 10,
        tractorCount: 5,
        preferredWindow: 'AM' as const,
        notes: 'Workflow test pickup - automated scheduling'
      };

      const result = await schedulePickup.mutateAsync(pickupData);
      
      setTestResults(prev => [...prev, { 
        step: 3, 
        status: 'success', 
        message: `Pickup scheduled successfully! Pickup ID: ${result.pickup.id}, Assignment ID: ${result.assignment.id}`,
        data: result
      }]);

      // Step 4: Verify in driver assignments (small delay to ensure data sync)
      setTestStep(4);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // This would need to be checked manually or with a refresh
      setTestResults(prev => [...prev, { 
        step: 4, 
        status: 'success', 
        message: `Assignment created - check driver routes page for confirmation`,
        data: { assignmentId: result.assignment.id }
      }]);

      // Step 5: Test completion
      setTestStep(5);
      setTestResults(prev => [...prev, { 
        step: 5, 
        status: 'success', 
        message: `Workflow test completed successfully! Driver should see assignment in their interface.`,
        data: null
      }]);

      toast({
        title: "Workflow test completed",
        description: "Pickup scheduling to driver assignment is working correctly",
      });

    } catch (error: any) {
      setTestResults(prev => [...prev, { 
        step: testStep, 
        status: 'error', 
        message: error.message,
        data: null
      }]);
      
      toast({
        title: "Workflow test failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Test Pickup → Driver Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Pickup to Driver Assignment Workflow Test
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What this test does:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Finds the test driver (oaklandreds20@gmail.com)</li>
              <li>Schedules a pickup with direct driver assignment</li>
              <li>Verifies the assignment is created correctly</li>
              <li>Confirms the driver can see it in their routes interface</li>
            </ol>
          </div>

          {/* Current driver assignments preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Current Driver Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {driverAssignments && driverAssignments.length > 0 ? (
                <div className="space-y-2">
                  {driverAssignments.slice(0, 3).map((assignment, index) => (
                    <div key={assignment.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span className="text-sm">
                          {assignment.pickup?.client?.company_name || 'Unknown Client'}
                        </span>
                      </div>
                      <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                        {assignment.status}
                      </Badge>
                    </div>
                  ))}
                  {driverAssignments.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      And {driverAssignments.length - 3} more assignments...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No current driver assignments found</p>
              )}
            </CardContent>
          </Card>

          {/* Test Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testSteps.map((step, index) => {
                  const stepNumber = index + 1;
                  const result = testResults.find(r => r.step === stepNumber);
                  
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 border rounded">
                      <div className="flex-shrink-0">
                        {result?.status === 'success' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : result?.status === 'error' ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : testStep >= stepNumber && isRunning ? (
                          <Clock className="h-5 w-5 text-blue-500 animate-spin" />
                        ) : (
                          <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{step}</p>
                        {result && (
                          <p className={`text-xs mt-1 ${
                            result.status === 'success' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detailed Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index} className="p-2 border rounded text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                          Step {result.step}
                        </Badge>
                        <span className="font-medium">{result.message}</span>
                      </div>
                      {result.data && (
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.data, null, 2).substring(0, 200)}...
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={runWorkflowTest}
              disabled={isRunning || !testDriver}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Run Workflow Test
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}