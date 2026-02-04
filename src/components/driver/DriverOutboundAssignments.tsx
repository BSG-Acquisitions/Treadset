import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  MapPin, 
  Package, 
  ArrowUpRight,
  Clock,
  PlayCircle
} from 'lucide-react';
import { useDriverOutboundAssignments, type OutboundAssignmentWithRelations } from '@/hooks/useOutboundAssignments';

interface DriverOutboundAssignmentsProps {
  date: string;
}

const MATERIAL_LABELS: Record<string, string> = {
  'whole_off_rim': 'Whole Tires',
  'shreds': 'Shredded',
  'crumb': 'Crumb',
  'baled': 'Baled',
  'tdf': 'TDF',
};

export function DriverOutboundAssignments({ date }: DriverOutboundAssignmentsProps) {
  const navigate = useNavigate();
  const { data: assignments = [], isLoading } = useDriverOutboundAssignments(date);

  const handleStartDelivery = (assignment: OutboundAssignmentWithRelations) => {
    // Navigate to outbound wizard with assignment pre-fill
    navigate(`/driver/outbound/new?assignmentId=${assignment.id}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            Today's Outbound Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse bg-muted h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return null; // Don't show section if no outbound assignments
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5" />
          Today's Outbound Deliveries
        </CardTitle>
        <CardDescription>
          {assignments.length} outbound {assignments.length === 1 ? 'delivery' : 'deliveries'} scheduled
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.map((assignment) => (
          <div 
            key={assignment.id} 
            className="flex items-start justify-between p-4 bg-muted/30 rounded-lg border border-primary/20"
          >
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <h4 className="font-medium truncate">
                  {assignment.destination_entity?.legal_name || 'Unknown Destination'}
                </h4>
                <Badge 
                  variant={assignment.status === 'in_progress' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {assignment.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                </Badge>
              </div>

              {assignment.destination_entity?.street_address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {assignment.destination_entity.street_address}
                  {assignment.destination_entity.city && `, ${assignment.destination_entity.city}`}
                  {assignment.destination_entity.state && ` ${assignment.destination_entity.state}`}
                </p>
              )}

              {(assignment.estimated_quantity || assignment.material_form) && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {assignment.estimated_quantity && (
                    <span>~{assignment.estimated_quantity} {assignment.estimated_unit}</span>
                  )}
                  {assignment.material_form && (
                    <span className="text-muted-foreground">
                      {assignment.estimated_quantity ? ' • ' : ''}
                      {MATERIAL_LABELS[assignment.material_form] || assignment.material_form}
                    </span>
                  )}
                </p>
              )}

              {assignment.notes && (
                <p className="text-sm text-muted-foreground italic">
                  "{assignment.notes}"
                </p>
              )}

              {assignment.vehicle && (
                <p className="text-xs text-muted-foreground">
                  Vehicle: {assignment.vehicle.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 ml-4">
              <Button 
                size="sm" 
                onClick={() => handleStartDelivery(assignment)}
                className="gap-1"
              >
                <PlayCircle className="h-4 w-4" />
                Start Delivery
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
