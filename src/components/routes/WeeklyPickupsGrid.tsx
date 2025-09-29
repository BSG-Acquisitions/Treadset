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
    <Card className={`flex flex-col ${isToday ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="pb-3 text-center border-b">
        <div className="space-y-1">
          <div className="text-sm font-medium text-muted-foreground">{format(day, "EEE")}</div>
          <div className={`text-2xl font-bold ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</div>
          <div className="text-xs text-muted-foreground">{format(day, "MMM yyyy")}</div>
          <Badge variant="secondary" className="mt-2">
            {pickups.length} pickups
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[60vh]">
          <div className="p-3 space-y-2">
            {pickups.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No pickups</p>
              </div>
            ) : (
              pickups.map((pickup: any) => (
                <div key={pickup.id} className="p-3 border rounded-lg hover:bg-secondary/10 transition-colors bg-card space-y-2">
                  {/* Client */}
                  <div className="flex items-start gap-2">
                    <Building className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="font-semibold text-sm leading-tight">
                      {pickup.client?.company_name || "Unknown Client"}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground leading-tight">
                      {pickup.location?.name || pickup.location?.address || "No address"}
                    </span>
                  </div>

                  {/* Counts & Revenue */}
                  <div className="text-xs font-medium space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PTE:</span>
                      <span>{pickup.pte_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">OTR:</span>
                      <span>{pickup.otr_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tractor:</span>
                      <span>{pickup.tractor_count}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-muted-foreground">Revenue:</span>
                      <span className="font-semibold">${pickup.computed_revenue?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <CompletePickupDialog
                      pickup={pickup}
                      trigger={
                        <Button size="sm" disabled={pickup.status === "completed"} className="flex-1 text-xs h-8">
                          {pickup.status === "completed" ? "Completed" : "Complete"}
                        </Button>
                      }
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="px-2 h-8">
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

                  {/* Manifest PDF */}
                  {pickup.status === "completed" && pickup.manifest_pdf_path && (
                    <div className="pt-2 border-t">
                      <ManifestPDFControls
                        manifestId={pickup.manifest_id}
                        acroformPdfPath={pickup.manifest_pdf_path}
                        clientEmails={[]}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function WeeklyPickupsGrid({ currentWeek, onMovePickup }: WeeklyPickupsGridProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {weekDays.map((day) => (
        <DayColumn key={day.toISOString()} day={day} onMovePickup={onMovePickup} />
      ))}
    </div>
  );
}
