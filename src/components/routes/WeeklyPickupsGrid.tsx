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
      <CardHeader className="pb-3 text-center border-b bg-muted/30">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{format(day, "EEE")}</div>
          <div className={`text-3xl font-bold ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</div>
          <div className="text-xs text-muted-foreground">{format(day, "MMM yyyy")}</div>
          <Badge variant="secondary" className="mt-2 text-xs px-2 py-0.5 font-medium">{pickups.length}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <div className="p-3 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">{/* Readable scrollable area */}
            {pickups.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pickups</p>
              </div>
            ) : (
              pickups.map((pickup: any) => (
                <div key={pickup.id} className="p-3 border-2 rounded-lg hover:bg-secondary/10 hover:border-primary/50 transition-all bg-card space-y-2.5 shadow-sm">
                  {/* Client */}
                  <div className="flex items-start gap-2">
                    <Building className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="font-bold text-sm leading-tight line-clamp-2">
                      {pickup.client?.company_name || "Unknown Client"}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground leading-tight line-clamp-2">
                      {pickup.location?.name || pickup.location?.address || "No address"}
                    </span>
                  </div>

                  {/* Counts & Revenue */}
                  <div className="text-xs font-medium bg-muted/30 rounded-md p-2">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <span className="text-muted-foreground">PTE:</span>
                      <span className="text-right font-semibold">{pickup.pte_count}</span>
                      <span className="text-muted-foreground">OTR:</span>
                      <span className="text-right font-semibold">{pickup.otr_count}</span>
                      <span className="text-muted-foreground">Tractor:</span>
                      <span className="text-right font-semibold">{pickup.tractor_count}</span>
                      <span className="text-muted-foreground font-bold text-primary">Revenue:</span>
                      <span className="text-right font-bold text-primary">${pickup.computed_revenue?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <CompletePickupDialog
                      pickup={pickup}
                      trigger={
                        <Button size="sm" disabled={pickup.status === "completed"} className="flex-1 text-xs h-8 font-semibold">
                          {pickup.status === "completed" ? "✓ Complete" : "Complete"}
                        </Button>
                      }
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="px-2 h-8">
                          <MoreVertical className="h-4 w-4" />
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

                  {/* Manifest PDF */}
                  {pickup.status === "completed" && pickup.manifest_pdf_path && (
                    <Badge variant="outline" className="text-[10px] w-full justify-center py-1 bg-green-50 text-green-700 border-green-300">
                      ✓ PDF Ready
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
    <div className="grid grid-cols-7 gap-4">{/* 7 equal columns for full week */}
      {weekDays.map((day) => (
        <DayColumn key={day.toISOString()} day={day} onMovePickup={onMovePickup} />
      ))}
    </div>
  );
}
