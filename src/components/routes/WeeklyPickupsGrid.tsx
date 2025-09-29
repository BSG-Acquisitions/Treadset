import { addDays, format } from "date-fns";
import { usePickups } from "@/hooks/usePickups";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ManifestPDFControls } from "@/components/ManifestPDFControls";
import { CompletePickupDialog } from "@/components/CompletePickupDialog";
import { Building, Calendar, MapPin, MoreVertical, Move } from "lucide-react";
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

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const isToday = dateStr === todayStr;

  return (
    <Card className={`flex flex-col h-full ${isToday ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="pb-2 text-center border-b">
        <div className="space-y-0.5">
          <div className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</div>
          <div className={`text-xl font-bold ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</div>
          <div className="text-[10px] text-muted-foreground">{format(day, "MMM yyyy")}</div>
          <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">{pickups.length}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <div className="p-2 space-y-1.5 max-h-[calc(100vh-300px)] overflow-y-auto">{/* Compact scrollable area */}
            {pickups.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">No pickups</p>
              </div>
            ) : (
              pickups.map((pickup: any) => (
                <div key={pickup.id} className="p-2 border rounded-md hover:bg-secondary/10 transition-colors bg-card space-y-1.5 text-xs">
                  {/* Client */}
                  <div className="flex items-start gap-1.5">
                    <Building className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="font-semibold text-xs leading-tight line-clamp-2">
                      {pickup.client?.company_name || "Unknown Client"}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
                      {pickup.location?.name || pickup.location?.address || "No address"}
                    </span>
                  </div>

                  {/* Counts & Revenue */}
                  <div className="text-[10px] font-medium space-y-0.5 py-1">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      <span className="text-muted-foreground">PTE:</span>
                      <span className="text-right">{pickup.pte_count}</span>
                      <span className="text-muted-foreground">OTR:</span>
                      <span className="text-right">{pickup.otr_count}</span>
                      <span className="text-muted-foreground">Tract:</span>
                      <span className="text-right">{pickup.tractor_count}</span>
                      <span className="text-muted-foreground font-semibold">$:</span>
                      <span className="text-right font-semibold">{pickup.computed_revenue?.toFixed(0) || "0"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-1">
                    <CompletePickupDialog
                      pickup={pickup}
                      trigger={
                        <Button size="sm" disabled={pickup.status === "completed"} className="flex-1 text-[10px] h-6 px-2">
                          {pickup.status === "completed" ? "✓ Done" : "Complete"}
                        </Button>
                      }
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="px-1.5 h-6">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onMovePickup && (
                          <DropdownMenuItem onClick={() => onMovePickup(pickup)}>
                            <Move className="h-4 w-4 mr-2" /> Move to Different Date
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Manifest PDF - Hide in compact view */}
                  {pickup.status === "completed" && pickup.manifest_pdf_path && (
                    <Badge variant="outline" className="text-[9px] w-full justify-center py-0.5">
                      PDF Ready
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
      </CardContent>
    </Card>
  );
}

export function WeeklyPickupsGrid({ currentWeek, onMovePickup }: WeeklyPickupsGridProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  return (
    <div className="grid grid-cols-7 gap-3 auto-rows-fr">{/* Equal height columns */}
      {weekDays.map((day) => (
        <DayColumn key={day.toISOString()} day={day} onMovePickup={onMovePickup} />
      ))}
    </div>
  );
}
