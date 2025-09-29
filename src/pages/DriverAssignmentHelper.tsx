import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Truck, User, Calendar, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { SchedulePickupWithDriverDialog } from "@/components/SchedulePickupWithDriverDialog";
import { WorkflowTestDialog } from "@/components/WorkflowTestDialog";
import { ManifestWorkflowTest } from "@/components/ManifestWorkflowTest";

export default function DriverAssignmentHelper() {
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const { toast } = useToast();

  const testDriverId = '78111d9f-18da-4b12-9faa-d76e3636a40f';
  const testDriverVehicleId = '7d3ed861-e27b-4297-9471-421cd6197374';

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          pickup:pickups(*,
            client:clients(company_name)
          ),
          vehicle:vehicles(name),
          assigned_driver:users!driver_id(first_name, last_name, email)
        `)
        .eq('scheduled_date', format(new Date(), 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const assignTestDriver = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ driver_id: testDriverId })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test Driver assigned to pickup"
      });

      loadAssignments(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Driver Assignment Helper
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-medium text-blue-800">Test Driver Info</h3>
              <p className="text-sm text-blue-600">
                Email: oaklandreds20@gmail.com<br/>
                User ID: {testDriverId}<br/>
                Vehicle: Truck 002- Test Driver
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <h4 className="font-medium text-green-800 mb-2">✅ Quick Fix - Schedule New Pickup with Driver</h4>
                <p className="text-sm text-green-600 mb-3">
                  Use this to schedule a pickup and assign it directly to Test Driver:
                </p>
                <div className="flex gap-3">
                  <SchedulePickupWithDriverDialog 
                    trigger={
                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                        <User className="h-4 w-4 mr-2" />
                        Schedule Pickup for Test Driver
                      </Button>
                    }
                  />
                  <WorkflowTestDialog />
                  <ManifestWorkflowTest />
                </div>
              </div>
            </div>

            <Button onClick={loadAssignments} disabled={loading}>
              {loading ? "Loading..." : "Refresh Assignments"}
            </Button>

            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span className="font-medium">{assignment.vehicle?.name}</span>
                      <Badge variant={assignment.driver_id ? 'default' : 'secondary'}>
                        {assignment.driver_id ? 'Assigned' : 'Unassigned'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {assignment.pickup?.client?.company_name || 'Unknown Client'}
                    </p>
                    {assignment.assigned_driver && (
                      <p className="text-sm text-blue-600">
                        Driver: {assignment.assigned_driver.first_name} {assignment.assigned_driver.last_name}
                      </p>
                    )}
                  </div>
                  
                  {assignment.vehicle_id === testDriverVehicleId && !assignment.driver_id && (
                    <Button
                      size="sm"
                      onClick={() => assignTestDriver(assignment.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Assign Test Driver
                    </Button>
                  )}
                  
                  {assignment.driver_id === testDriverId && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Test Driver Assigned</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {assignments.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">
                No assignments found for today
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}