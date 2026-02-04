import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Plus, 
  Truck, 
  Scale, 
  Package, 
  TrendingUp,
  FileText
} from "lucide-react";
import { ShipmentsList } from "@/components/shipments/ShipmentsList";
import { ShipmentDialog } from "@/components/shipments/ShipmentDialog";
import { useShipments, type ShipmentWithRelations } from "@/hooks/useShipments";
import { formatNumber } from "@/lib/formatters";

export default function Shipments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<ShipmentWithRelations | null>(null);
  
  const { data: shipments } = useShipments({ direction: 'outbound' });

  // Calculate summary stats
  const totalShipments = shipments?.length || 0;
  const totalPTE = shipments?.reduce((sum, s) => sum + (s.quantity_pte || 0), 0) || 0;
  const totalTons = shipments?.reduce((sum, s) => sum + (s.tons || 0), 0) || 0;
  
  // Count unique destinations
  const uniqueDestinations = new Set(shipments?.map(s => s.destination_entity_id)).size;

  const handleEdit = (shipment: ShipmentWithRelations) => {
    setEditingShipment(shipment);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingShipment(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="p-0 h-auto font-normal hover:text-foreground">
          <Link to="/" className="flex items-center gap-1">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <span>/</span>
        <span className="text-foreground">Material Shipments</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Material Shipments</h1>
          <p className="text-muted-foreground">
            Track outbound tire and material shipments for state compliance
          </p>
        </div>
        
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Shipment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalShipments)}</div>
            <p className="text-xs text-muted-foreground">Outbound loads recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PTEs Out</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalPTE)}</div>
            <p className="text-xs text-muted-foreground">Passenger tire equivalents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tons Out</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(totalTons, { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">MI Rule: 89 PTE = 1 ton</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Destinations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(uniqueDestinations)}</div>
            <p className="text-xs text-muted-foreground">Unique processors/buyers</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold">State Compliance Tracking</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Record all outbound material movements here to maintain complete audit trails for Michigan EGLE reporting. 
                This data flows directly into your annual compliance reports.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipments List */}
      <ShipmentsList onEdit={handleEdit} />

      {/* Dialog */}
      <ShipmentDialog 
        open={dialogOpen} 
        onOpenChange={handleDialogClose}
        editingShipment={editingShipment}
      />
    </div>
  );
}
