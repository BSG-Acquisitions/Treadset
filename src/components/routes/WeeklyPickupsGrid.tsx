import { addDays, format } from "date-fns";
import { usePickups } from "@/hooks/usePickups";
import { useVehicles } from "@/hooks/useVehicles";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import React from "react";

export type WeeklyPickupsGridProps = {
  currentWeek: Date;
  onMovePickup?: (pickup: any) => void;
};

function DayColumn({ day, onMovePickup }: { day: Date; onMovePickup?: (pickup: any) => void }) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(day.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${dayOfMonth}`;

  const { data: pickups = [] } = usePickups(dateStr);
  const { data: vehicles = [] } = useVehicles();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const isToday = dateStr === todayStr;

  // Group pickups by vehicle
  const pickupsByVehicle = pickups.reduce((acc: any, pickup: any) => {
    const vehicleId = pickup.daily_assignments?.[0]?.vehicle_id || 'unassigned';
    if (!acc[vehicleId]) {
      acc[vehicleId] = [];
    }
    acc[vehicleId].push(pickup);
    return acc;
  }, {});

  return (
    <div className="flex flex-col">
      {/* Day Header */}
      <div className={`text-center py-3 rounded-t-lg border-b-2 ${isToday ? 'bg-green-600 text-white' : 'bg-white border-gray-200'}`}>
        <div className={`text-sm font-semibold ${isToday ? 'text-white' : 'text-gray-700'}`}>
          {format(day, "EEEE")}
        </div>
        <div className={`text-sm ${isToday ? 'text-white' : 'text-gray-600'}`}>
          {format(day, "MMM d yyyy")}
        </div>
      </div>

      {/* Pickups List */}
      <div className="space-y-3 pt-3 min-h-[600px] bg-gray-50">
        {pickups.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No pickups
          </div>
        ) : (
          Object.entries(pickupsByVehicle).map(([vehicleId, vehiclePickups]: [string, any]) => {
            const vehicle = vehicles.find(v => v.id === vehicleId);
            const driver = vehiclePickups[0]?.daily_assignments?.[0]?.assigned_driver;
            
            return (
              <div key={vehicleId} className="space-y-3">
                {(vehiclePickups as any[]).map((pickup: any) => (
                  <div
                    key={pickup.id}
                    className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer mx-2"
                    onClick={() => onMovePickup?.(pickup)}
                  >
                    {/* Vehicle/Driver Header */}
                    <div className="flex items-center gap-2 mb-3 text-gray-600 text-sm">
                      <span>🚚</span>
                      <span className="font-semibold">
                        {vehicle?.name || 'Truck'} - {driver?.full_name || 'Unassigned'}
                      </span>
                    </div>

                    {/* Client Name */}
                    <div className="font-bold text-base text-gray-900 mb-2 leading-tight">
                      {pickup.client?.company_name || "Unknown Client"}
                    </div>

                    {/* Address */}
                    <div className="text-sm text-gray-700 leading-relaxed mb-3">
                      {pickup.location?.address || 
                       [
                         pickup.client?.mailing_address,
                         [pickup.client?.city, pickup.client?.state].filter(Boolean).join(', '),
                         pickup.client?.zip,
                       ].filter(Boolean).join(' ') || 
                       'No address'}
                    </div>

                    {/* Tire Counts */}
                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                      <span>PTE: <span className="font-semibold text-gray-900">{pickup.pte_count || 0}</span></span>
                      <span>OTR: <span className="font-semibold text-gray-900">{pickup.otr_count || 0}</span></span>
                      <span>Tractor: <span className="font-semibold text-gray-900">{pickup.tractor_count || 0}</span></span>
                    </div>

                    {/* Revenue */}
                    <div className="text-xs text-gray-600 pt-2 border-t border-gray-200">
                      Revenue: <span className="font-bold text-green-600">${pickup.computed_revenue?.toFixed(2) || '0.00'}</span>
                    </div>

                    {/* Notes if present */}
                    {pickup.notes && (
                      <div className="text-xs text-gray-500 italic mt-2 pt-2 border-t border-gray-100">
                        📝 {pickup.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function WeeklyPickupsGrid({ currentWeek, onMovePickup }: WeeklyPickupsGridProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  return (
    <div className="grid grid-cols-7 gap-0 border border-gray-300 rounded-lg overflow-hidden bg-white">
      {weekDays.map((day, index) => (
        <div 
          key={day.toISOString()} 
          className={index < 6 ? "border-r border-gray-300" : ""}
        >
          <DayColumn day={day} onMovePickup={onMovePickup} />
        </div>
      ))}
    </div>
  );
}
