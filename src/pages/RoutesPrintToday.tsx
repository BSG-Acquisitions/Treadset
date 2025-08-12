import { useEffect } from "react";
import { useAssignments } from "@/hooks/usePickups";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function RoutesPrintToday() {
  useEffect(() => {
    document.title = "Print Today's Routes – BSG";
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

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'TBD';
    return new Date(timeStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <p>Loading routes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Print button - hidden in print */}
      <div className="no-print p-4 bg-gray-100 border-b">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Print Today's Routes</h1>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Routes
          </Button>
        </div>
      </div>

      {/* Print content */}
      <div className="print-content">
        {Object.keys(vehicleRoutes).length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-lg">No routes scheduled for today.</p>
          </div>
        ) : (
          Object.values(vehicleRoutes).map(({ vehicle, assignments }, index) => (
            <div key={vehicle?.id || index} className="vehicle-page">
              {/* Vehicle header */}
              <div className="mb-6">
                <div className="text-center mb-4">
                  <h1 className="text-2xl font-bold">BSG Logistics</h1>
                  <p className="text-lg">Daily Route Sheet</p>
                  <p className="text-sm">{formatDate(today)}</p>
                </div>
                
                <div className="mb-4">
                  <h2 className="text-xl font-bold">{vehicle?.name || 'Unknown Vehicle'}</h2>
                  <p className="text-sm">Driver: _____________________ Signature: _____________________</p>
                  <p className="text-sm">Start Time: _______ End Time: _______ Total Miles: _______</p>
                </div>
              </div>

              {/* Routes table */}
              <table className="w-full border-collapse border border-black mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2 w-12">#</th>
                    <th className="border border-black p-2 w-20">ETA</th>
                    <th className="border border-black p-2">Client</th>
                    <th className="border border-black p-2">Address</th>
                    <th className="border border-black p-2 w-16">PTE</th>
                    <th className="border border-black p-2 w-16">OTR</th>
                    <th className="border border-black p-2 w-20">Tractor</th>
                    <th className="border border-black p-2 w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment, idx) => (
                    <tr key={assignment.id}>
                      <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black p-2 text-center">
                        {formatTime(assignment.estimated_arrival)}
                      </td>
                      <td className="border border-black p-2">
                        {assignment.pickup?.client?.company_name || 'Unknown Client'}
                      </td>
                      <td className="border border-black p-2">
                        {assignment.pickup?.location?.address || 'Address TBD'}
                      </td>
                      <td className="border border-black p-2 text-center">
                        {assignment.pickup?.pte_count || 0}
                      </td>
                      <td className="border border-black p-2 text-center">
                        {assignment.pickup?.otr_count || 0}
                      </td>
                      <td className="border border-black p-2 text-center">
                        {assignment.pickup?.tractor_count || 0}
                      </td>
                      <td className="border border-black p-2 text-center">
                        ☐ Progress ☐ Complete
                      </td>
                    </tr>
                  ))}
                  {/* Add empty rows for manual entries */}
                  {[...Array(3)].map((_, idx) => (
                    <tr key={`empty-${idx}`}>
                      <td className="border border-black p-2 h-8"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Notes section */}
              <div className="mb-4">
                <h3 className="font-bold mb-2">Notes & Comments:</h3>
                <div className="border border-black h-20 p-2"></div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Total Stops:</strong> {assignments.length}</p>
                  <p><strong>Total PTE:</strong> {assignments.reduce((sum, a) => sum + (a.pickup?.pte_count || 0), 0)}</p>
                </div>
                <div>
                  <p><strong>Vehicle Capacity:</strong> {vehicle?.capacity || 0} PTE</p>
                  <p><strong>Remaining Capacity:</strong> {(vehicle?.capacity || 0) - assignments.reduce((sum, a) => sum + (a.pickup?.pte_count || 0), 0)} PTE</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          .no-print {
            display: none !important;
          }
          
          .vehicle-page {
            page-break-after: always;
            padding: 1rem;
          }
          
          .vehicle-page:last-child {
            page-break-after: auto;
          }
          
          table {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          body {
            -webkit-print-color-adjust: exact;
          }
        }
        
        @media screen {
          .vehicle-page {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 1rem;
            border-bottom: 2px dashed #ccc;
            margin-bottom: 2rem;
          }
          
          .vehicle-page:last-child {
            border-bottom: none;
          }
        }
        
        table {
          font-size: 12px;
        }
        
        th, td {
          font-size: 11px;
        }
        `
      }} />
    </div>
  );
}