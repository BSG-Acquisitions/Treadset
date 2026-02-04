import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { Link } from 'react-router-dom';
import { BrandHeader } from '@/components/BrandHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Plus, 
  Truck, 
  MapPin, 
  Package, 
  CalendarIcon,
  User,
  CheckCircle,
  Clock,
  XCircle,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScheduleOutboundDialog } from '@/components/outbound/ScheduleOutboundDialog';
import { 
  useOutboundAssignmentsAdmin, 
  useCancelOutboundAssignment,
  type OutboundAssignmentWithRelations 
} from '@/hooks/useOutboundAssignments';
import { useDrivers } from '@/hooks/useDrivers';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', variant: 'secondary' as const, icon: Clock },
  in_progress: { label: 'In Progress', variant: 'default' as const, icon: Truck },
  completed: { label: 'Completed', variant: 'outline' as const, icon: CheckCircle },
  cancelled: { label: 'Cancelled', variant: 'destructive' as const, icon: XCircle },
};

const MATERIAL_LABELS: Record<string, string> = {
  'whole_off_rim': 'Whole Tires',
  'shreds': 'Shredded',
  'crumb': 'Crumb',
  'baled': 'Baled',
  'tdf': 'TDF',
};

export default function OutboundSchedule() {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('upcoming');

  const { data: drivers = [] } = useDrivers();
  const cancelAssignment = useCancelOutboundAssignment();

  // Fetch assignments based on filters
  const dateFilter = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const driverFilter = selectedDriver !== 'all' ? selectedDriver : undefined;
  
  const { data: allAssignments = [], isLoading, refetch } = useOutboundAssignmentsAdmin({
    date: activeTab === 'today' ? format(new Date(), 'yyyy-MM-dd') : dateFilter,
    driverId: driverFilter,
    status: activeTab === 'completed' ? 'completed' : undefined,
  });

  // Filter based on tab
  const filteredAssignments = allAssignments.filter(a => {
    if (activeTab === 'upcoming') return a.status === 'scheduled' || a.status === 'in_progress';
    if (activeTab === 'today') return true;
    if (activeTab === 'completed') return a.status === 'completed';
    return true;
  });

  useEffect(() => {
    document.title = "Outbound – TreadSet";
  }, []);

  const handleCancel = async (id: string) => {
    if (confirm('Are you sure you want to cancel this outbound delivery?')) {
      await cancelAssignment.mutateAsync(id);
    }
  };

  const renderAssignmentCard = (assignment: OutboundAssignmentWithRelations) => {
    const statusConfig = STATUS_CONFIG[assignment.status];
    const StatusIcon = statusConfig.icon;

    return (
      <Card key={assignment.id} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Header with destination and status */}
              <div className="flex items-center gap-2 flex-wrap">
                <Truck className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-medium truncate">
                  {assignment.destination_entity?.legal_name || 'Unknown'}
                </span>
                <Badge variant={statusConfig.variant} className="text-xs gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Driver and date */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span>
                    {assignment.driver 
                      ? `${assignment.driver.first_name} ${assignment.driver.last_name}`
                      : 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>{format(new Date(assignment.scheduled_date), 'MMM d, yyyy')}</span>
                </div>
              </div>

              {/* Address */}
              {assignment.destination_entity?.street_address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {assignment.destination_entity.street_address}
                    {assignment.destination_entity.city && `, ${assignment.destination_entity.city}`}
                    {assignment.destination_entity.state && ` ${assignment.destination_entity.state}`}
                  </span>
                </p>
              )}

              {/* Material estimate */}
              {(assignment.estimated_quantity || assignment.material_form) && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Package className="h-3.5 w-3.5 flex-shrink-0" />
                  {assignment.estimated_quantity && (
                    <span>~{assignment.estimated_quantity} {assignment.estimated_unit}</span>
                  )}
                  {assignment.material_form && (
                    <span>
                      {assignment.estimated_quantity ? ' • ' : ''}
                      {MATERIAL_LABELS[assignment.material_form] || assignment.material_form}
                    </span>
                  )}
                </p>
              )}

              {/* Notes */}
              {assignment.notes && (
                <p className="text-sm text-muted-foreground italic">
                  "{assignment.notes}"
                </p>
              )}

              {/* Linked manifest */}
              {assignment.manifest && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-3.5 w-3.5 text-green-600" />
                  <Link 
                    to={`/manifests/${assignment.manifest.id}`}
                    className="text-primary hover:underline"
                  >
                    {assignment.manifest.manifest_number}
                  </Link>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {assignment.status === 'scheduled' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancel(assignment.id)}
                  className="text-destructive hover:text-destructive"
                >
                  Cancel
                </Button>
              )}
              {assignment.manifest && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/manifests/${assignment.manifest.id}`}>
                    View Manifest
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <BrandHeader 
            title="Outbound"
            subtitle="Manage outbound delivery assignments"
          />
          <Button onClick={() => setScheduleDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Delivery
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Date:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[180px] justify-start text-left font-normal',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'All dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                    <div className="p-2 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedDate(undefined)}
                      >
                        Clear date filter
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Driver:</span>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All drivers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All drivers</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.first_name} {driver.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="today" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Today
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-muted h-32 rounded-lg" />
                ))}
              </div>
            ) : filteredAssignments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-2">No Upcoming Deliveries</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Schedule an outbound delivery to get started
                  </p>
                  <Button onClick={() => setScheduleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Delivery
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAssignments.map(renderAssignmentCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="today" className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-muted h-32 rounded-lg" />
                ))}
              </div>
            ) : filteredAssignments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-2">No Deliveries Today</h3>
                  <p className="text-sm text-muted-foreground">
                    No outbound deliveries scheduled for today
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAssignments.map(renderAssignmentCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-muted h-32 rounded-lg" />
                ))}
              </div>
            ) : filteredAssignments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-2">No Completed Deliveries</h3>
                  <p className="text-sm text-muted-foreground">
                    Completed outbound deliveries will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAssignments.map(renderAssignmentCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Schedule Dialog */}
        <ScheduleOutboundDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          onSuccess={() => refetch()}
          defaultDate={new Date()}
        />
      </main>
    </div>
  );
}
