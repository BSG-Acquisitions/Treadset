import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Truck, 
  MapPin, 
  Calendar, 
  Package, 
  Scale, 
  FileText, 
  Search,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useShipments, useDeleteShipment, type ShipmentWithRelations } from "@/hooks/useShipments";
import { useDestinationEntities } from "@/hooks/useEntities";
import { formatNumber } from "@/lib/formatters";
import type { Database } from "@/integrations/supabase/types";

type MaterialForm = Database['public']['Enums']['material_form'];

interface ShipmentsListProps {
  onEdit?: (shipment: ShipmentWithRelations) => void;
}

const MATERIAL_FORM_LABELS: Record<MaterialForm, string> = {
  whole_off_rim: 'Whole Tires (Off-Rim)',
  on_rim: 'Tires (On-Rim)',
  semi: 'Semi/Truck Tires',
  otr: 'OTR Tires',
  shreds: 'Shredded Material',
  crumb: 'Crumb Rubber',
  baled: 'Baled Tires',
  tdf: 'TDF (Tire Derived Fuel)'
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

export function ShipmentsList({ onEdit }: ShipmentsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<string>("all");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");

  const { data: shipments, isLoading, error } = useShipments({ direction: 'outbound' });
  const { data: destinations } = useDestinationEntities();
  const deleteShipment = useDeleteShipment();

  const filteredShipments = (shipments || []).filter(shipment => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        shipment.destination_entity?.legal_name?.toLowerCase().includes(searchLower) ||
        shipment.bol_number?.toLowerCase().includes(searchLower) ||
        shipment.carrier?.toLowerCase().includes(searchLower) ||
        shipment.notes?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Destination filter
    if (selectedDestination !== "all" && shipment.destination_entity_id !== selectedDestination) {
      return false;
    }

    // Material filter
    if (selectedMaterial !== "all" && shipment.material_form !== selectedMaterial) {
      return false;
    }

    return true;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this shipment?')) {
      await deleteShipment.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading shipments: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shipments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedDestination} onValueChange={setSelectedDestination}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Destinations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Destinations</SelectItem>
            {destinations?.map(dest => (
              <SelectItem key={dest.id} value={dest.id}>
                {dest.legal_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Materials" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            {Object.entries(MATERIAL_FORM_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No outbound shipments found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Record your first shipment to start tracking outbound material
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredShipments.map(shipment => (
            <Card key={shipment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Header: Date and Destination */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(shipment.departed_at), 'MMM d, yyyy')}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2 font-medium">
                        <MapPin className="h-4 w-4 text-primary" />
                        {shipment.destination_entity?.legal_name || 'Unknown Destination'}
                      </div>
                    </div>

                    {/* Material and Quantity */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary">
                          {MATERIAL_FORM_LABELS[shipment.material_form]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {formatNumber(shipment.tons || 0, { maximumFractionDigits: 2 })} tons
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({formatNumber(shipment.quantity_pte)} PTE)
                        </span>
                      </div>
                    </div>

                    {/* Details Row */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {shipment.carrier && (
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {shipment.carrier}
                        </div>
                      )}
                      {shipment.bol_number && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          BOL: {shipment.bol_number}
                        </div>
                      )}
                      {shipment.end_use && (
                        <Badge variant="outline" className="text-xs">
                          {END_USE_LABELS[shipment.end_use] || shipment.end_use}
                        </Badge>
                      )}
                      {shipment.arrived_at && (
                        <Badge variant="default" className="text-xs">
                          Delivered
                        </Badge>
                      )}
                    </div>

                    {/* Notes */}
                    {shipment.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {shipment.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(shipment)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(shipment.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      {filteredShipments.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="py-3">
            <div className="flex flex-wrap justify-between items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Showing {filteredShipments.length} shipment{filteredShipments.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-4">
                <span>
                  <strong>{formatNumber(filteredShipments.reduce((sum, s) => sum + (s.quantity_pte || 0), 0))}</strong> PTE
                </span>
                <span>
                  <strong>{formatNumber(filteredShipments.reduce((sum, s) => sum + (s.tons || 0), 0), { maximumFractionDigits: 2 })}</strong> tons
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
