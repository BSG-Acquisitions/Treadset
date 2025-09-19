import { useEffect } from "react";
import { useAssignments } from "@/hooks/usePickups";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatTime, formatDate } from "@/lib/formatters";


export default function RoutesPrintToday() {
  useEffect(() => {
    document.title = "Print Today's Routes – BSG Logistics";
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const { data: assignments = [], isLoading } = useAssignments(today);

  // Group assignments by vehicle
  const vehicleRoutes = assignments.reduce((acc, assignment) => {
    const vehicleId = assignment.vehicle_id;
    if (!acc[vehicleId]) {
      acc[vehicleId] = {
        vehicle: assignment.vehicle,
        assignments: []
      };
    }
    acc[vehicleId].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { vehicle: any; assignments: any[] }>);

  // Sort assignments within each vehicle by ETA
  Object.values(vehicleRoutes).forEach(route => {
    route.assignments.sort((a, b) => 
      new Date(a.estimated_arrival || 0).getTime() - new Date(b.estimated_arrival || 0).getTime()
    );
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
          </div>
          <p className="mt-4 text-muted-foreground">Loading routes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="min-h-screen">
      {/* Screen-only controls */}
      <div className="print-hidden bg-background border-b border-border p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Print Today's Routes</h1>
            <p className="text-muted-foreground">{formatDate(today)}</p>
          </div>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Routes
          </Button>
        </div>
      </div>

      {/* Print content */}
      <div className="print-content">
        {Object.keys(vehicleRoutes).length === 0 ? (
          <div className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-foreground mb-2">No routes scheduled</h3>
              <p className="text-muted-foreground">There are no pickup routes scheduled for today.</p>
            </div>
          </div>
        ) : (
          Object.values(vehicleRoutes).map(({ vehicle, assignments }, index) => (
            <div key={vehicle?.id || index} className="print-page-break vehicle-route-page">
              {/* Page header */}
              <div className="mb-8">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-sm">B</span>
                    </div>
                    <h1 className="text-2xl font-bold">BSG Tire Recycling</h1>
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground">Daily Route Sheet</p>
                  <p className="text-sm text-muted-foreground">{formatDate(today)}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-8 mb-6 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">
                      {vehicle?.name || 'Unknown Vehicle'}
                    </h2>
                    <p className="text-sm">License: {vehicle?.license_plate || 'N/A'}</p>
                    <p className="text-sm">Capacity: {vehicle?.capacity || 0} PTE</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-border pb-1">
                      <span className="font-medium">Driver:</span>
                      <span className="border-b border-dotted border-foreground w-32"></span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1">
                      <span className="font-medium">Start Time:</span>
                      <span className="border-b border-dotted border-foreground w-20"></span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1">
                      <span className="font-medium">End Time:</span>
                      <span className="border-b border-dotted border-foreground w-20"></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Routes table */}
              <div className="mb-8">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-3 text-left font-semibold w-12">#</th>
                      <th className="border border-border p-3 text-left font-semibold w-20">ETA</th>
                      <th className="border border-border p-3 text-left font-semibold">Client</th>
                      <th className="border border-border p-3 text-left font-semibold">Address</th>
                      <th className="border border-border p-3 text-center font-semibold w-16 numeric">PTE</th>
                      <th className="border border-border p-3 text-center font-semibold w-16 numeric">OTR</th>
                      <th className="border border-border p-3 text-center font-semibold w-20 numeric">Tractor</th>
                      <th className="border border-border p-3 text-center font-semibold w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment, idx) => (
                      <tr key={assignment.id} className="hover:bg-muted/20">
                        <td className="border border-border p-3 text-center font-semibold">{idx + 1}</td>
                        <td className="border border-border p-3 text-center tabular-nums">
                          {formatTime(assignment.estimated_arrival)}
                        </td>
                        <td className="border border-border p-3 font-medium">
                          {assignment.pickup?.client?.company_name || 'Unknown Client'}
                        </td>
                        <td className="border border-border p-3 text-sm">
                          <div className="font-medium">{assignment.pickup?.location?.address || 'Address TBD'}</div>
                          {assignment.pickup?.location?.access_notes && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Access: {assignment.pickup?.location?.access_notes}
                            </div>
                          )}
                        </td>
                        <td className="border border-border p-3 text-center numeric">
                          {assignment.pickup?.pte_count || 0}
                        </td>
                        <td className="border border-border p-3 text-center numeric">
                          {assignment.pickup?.otr_count || 0}
                        </td>
                        <td className="border border-border p-3 text-center numeric">
                          {assignment.pickup?.tractor_count || 0}
                        </td>
                        <td className="border border-border p-3 text-center text-xs">
                          <div className="flex items-center justify-center gap-2">
                            <label className="flex items-center gap-1">
                              <input type="checkbox" className="w-3 h-3" />
                              <span>Progress</span>
                            </label>
                            <label className="flex items-center gap-1">
                              <input type="checkbox" className="w-3 h-3" />
                              <span>Complete</span>
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Add empty rows for manual entries */}
                    {[...Array(Math.max(0, 5 - assignments.length))].map((_, idx) => (
                      <tr key={`empty-${idx}`}>
                        <td className="border border-border p-3 h-12"></td>
                        <td className="border border-border p-3"></td>
                        <td className="border border-border p-3"></td>
                        <td className="border border-border p-3"></td>
                        <td className="border border-border p-3"></td>
                        <td className="border border-border p-3"></td>
                        <td className="border border-border p-3"></td>
                        <td className="border border-border p-3"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Route summary */}
              <div className="grid grid-cols-3 gap-6 mb-8 p-4 bg-muted/30 rounded-lg">
                <div>
                  <h4 className="font-semibold mb-2">Route Summary</h4>
                  <p className="text-sm"><strong>Total Stops:</strong> {assignments.length}</p>
                  <p className="text-sm"><strong>Total PTE:</strong> {assignments.reduce((sum, a) => sum + (a.pickup?.pte_count || 0), 0)}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Vehicle Info</h4>
                  <p className="text-sm"><strong>Capacity:</strong> {vehicle?.capacity || 0} PTE</p>
                  <p className="text-sm"><strong>Remaining:</strong> {(vehicle?.capacity || 0) - assignments.reduce((sum, a) => sum + (a.pickup?.pte_count || 0), 0)} PTE</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Totals</h4>
                  <p className="text-sm"><strong>OTR:</strong> {assignments.reduce((sum, a) => sum + (a.pickup?.otr_count || 0), 0)}</p>
                  <p className="text-sm"><strong>Tractor:</strong> {assignments.reduce((sum, a) => sum + (a.pickup?.tractor_count || 0), 0)}</p>
                </div>
              </div>

              {/* Notes section */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Driver Notes & Comments</h4>
                <div className="border border-border rounded-lg p-3 min-h-[100px] bg-background">
                  {/* Empty space for handwritten notes */}
                </div>
              </div>

              {/* Signature section */}
              <div className="flex justify-between items-end pt-6 border-t border-border">
                <div className="text-center">
                  <div className="border-b border-dotted border-foreground w-48 mb-2"></div>
                  <p className="text-sm font-medium">Driver Signature</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-dotted border-foreground w-32 mb-2"></div>
                  <p className="text-sm font-medium">Date</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-dotted border-foreground w-32 mb-2"></div>
                  <p className="text-sm font-medium">Total Miles</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
}