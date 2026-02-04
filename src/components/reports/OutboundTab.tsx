import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Truck, MapPin, Package, Scale, ArrowUpRight, Plus } from "lucide-react";
import { useOutboundSummary } from "@/hooks/useShipments";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/formatters";

interface OutboundTabProps {
  year: number;
}

const MATERIAL_FORM_LABELS: Record<string, string> = {
  whole_off_rim: 'Whole Tires (Off-Rim)',
  on_rim: 'Tires (On-Rim)',
  semi: 'Semi/Truck Tires',
  otr: 'OTR Tires',
  shreds: 'Shredded Material',
  crumb: 'Crumb Rubber',
  baled: 'Baled Tires',
  tdf: 'TDF'
};

const END_USE_LABELS: Record<string, string> = {
  reuse: 'Reuse/Retread',
  tdf: 'Tire Derived Fuel',
  crumb_rubberized: 'Crumb/Rubberized',
  civil_construction: 'Civil Construction',
  agriculture: 'Agriculture',
  landfill: 'Landfill',
  export: 'Export',
  other: 'Other/Processing'
};

export function OutboundTab({ year }: OutboundTabProps) {
  const { data: summary, isLoading, error } = useOutboundSummary(year);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading outbound data: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const hasData = summary && summary.totalShipments > 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-orange-200">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-orange-600">{formatNumber(summary?.totalPTE || 0)}</div>
            <p className="font-medium">Total PTEs Out</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-600">
              {formatNumber(summary?.totalTons || 0, { maximumFractionDigits: 2 })}
            </div>
            <p className="font-medium">Total Tons Out</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-amber-600">{formatNumber(summary?.totalShipments || 0)}</div>
            <p className="font-medium">Shipments</p>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No outbound shipments recorded for {year}</p>
            <Button asChild>
              <Link to="/shipments">
                <Plus className="h-4 w-4 mr-2" />
                Record Shipments
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Destination */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                By Destination
              </CardTitle>
              <CardDescription>Material sent to each processor/buyer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(summary?.byDestination || {}).map(([id, dest]) => (
                  <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{dest.name}</p>
                      <p className="text-sm text-muted-foreground">{dest.shipments} shipment{dest.shipments !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatNumber(dest.tons, { maximumFractionDigits: 2 })} tons</p>
                      <p className="text-sm text-muted-foreground">{formatNumber(dest.pte)} PTE</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By Material Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                By Material Type
              </CardTitle>
              <CardDescription>Outbound material by form</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(summary?.byMaterialForm || {}).map(([form, data]) => (
                  <div key={form} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <Badge variant="secondary">{MATERIAL_FORM_LABELS[form] || form}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatNumber(data.tons, { maximumFractionDigits: 2 })} tons</p>
                      <p className="text-sm text-muted-foreground">{formatNumber(data.pte)} PTE</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By End Use */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                By End Use
              </CardTitle>
              <CardDescription>Material disposition for state reporting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(summary?.byEndUse || {}).map(([use, data]) => (
                  <div key={use} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <Badge variant="outline">{END_USE_LABELS[use] || use}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatNumber(data.tons, { maximumFractionDigits: 2 })} tons</p>
                      <p className="text-sm text-muted-foreground">{formatNumber(data.pte)} PTE</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Outbound Management</CardTitle>
              <CardDescription>Record and manage material shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button asChild className="w-full justify-between">
                  <Link to="/shipments">
                    View All Shipments
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  Record outbound manifests, enter historical data, and track material destinations for complete compliance documentation.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
