import { addDays, format } from "date-fns";
import { usePickups } from "@/hooks/usePickups";
import { useVehicles } from "@/hooks/useVehicles";
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
    <div className="flex flex-col h-full border-r border-gray-300 last:border-r-0">
      {/* Day Header */}
      <div className={`text-center py-4 border-b-2 border-gray-300 ${isToday ? 'bg-[#5b8f4d] text-white' : 'bg-white text-gray-800'}`}>
        <div className={`font-semibold text-base mb-1 ${isToday ? 'text-white' : 'text-gray-900'}`}>
          {format(day, "EEEE")}
        </div>
        <div className={`text-sm ${isToday ? 'text-white' : 'text-gray-600'}`}>
          {format(day, "MMM d yyyy")}
        </div>
      </div>

      {/* Pickups List */}
      <div className="flex-1 bg-[#f5f5f5] p-2 overflow-y-auto">
        {pickups.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {/* Empty state */}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(pickupsByVehicle).map(([vehicleId, vehiclePickups]: [string, any]) => {
              const vehicle = vehicles.find(v => v.id === vehicleId);
              const driver = vehiclePickups[0]?.daily_assignments?.[0]?.assigned_driver;
              
              return (
                <div key={vehicleId} className="space-y-3">
                  {(vehiclePickups as any[]).map((pickup: any) => (
                    <div
                      key={pickup.id}
                      className="bg-white rounded border border-gray-300 p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onMovePickup?.(pickup)}
                    >
                      {/* Vehicle/Driver Header */}
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="text-base">🚚</span>
                        <span className="text-sm font-medium text-gray-700">
                          {vehicle?.name || 'Truck'} - {driver ? (`${driver.first_name || ''} ${driver.last_name || ''}`.trim() || driver.email) : 'Unassigned'}
                        </span>
                      </div>

                      {/* Client Name */}
                      <div className="font-bold text-[15px] text-gray-900 mb-1.5 leading-tight">
                        {pickup.client?.company_name || "Unknown Client"}
                      </div>

                      {/* Address */}
                      <div className="text-[13px] text-gray-600 leading-relaxed">
                        {pickup.location?.address || 
                         [
                           pickup.client?.mailing_address,
                           [pickup.client?.city, pickup.client?.state].filter(Boolean).join(', '),
                           pickup.client?.zip,
                         ].filter(Boolean).join(' ') || 
                         'No address'}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function WeeklyPickupsGrid({ currentWeek, onMovePickup }: WeeklyPickupsGridProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  return (
    <div className="grid grid-cols-7 border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
      {weekDays.map((day) => (
        <DayColumn key={day.toISOString()} day={day} onMovePickup={onMovePickup} />
      ))}
    </div>
  );
}
