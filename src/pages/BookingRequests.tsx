import { useState, useEffect } from 'react';
import { useBookingRequests, useProcessBookingRequest, useDeleteBookingRequest, BookingRequest } from '@/hooks/useBookingRequests';
import { useVehicles } from '@/hooks/useVehicles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { Calendar, MapPin, Clock, User, Building2, Check, X, CalendarClock, Truck, AlertTriangle, Trash2 } from 'lucide-react';
import { SlideUp } from '@/components/motion/SlideUp';

export default function BookingRequests() {
  const [activeTab, setActiveTab] = useState('pending');
  const { data: bookingRequests = [], isLoading } = useBookingRequests(activeTab === 'all' ? undefined : activeTab);
  const { data: vehicles = [] } = useVehicles();
  const processBooking = useProcessBookingRequest();
  const deleteBooking = useDeleteBookingRequest();

  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'modify' | 'decline' | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<BookingRequest | null>(null);
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTimeWindow: '',
    suggestedDate: '',
    modificationReason: '',
    declineReason: '',
    adminNotes: '',
    vehicleId: '',
  });

  useEffect(() => {
    document.title = 'Booking Requests | TreadSet';
  }, []);

  const openActionDialog = (booking: BookingRequest, action: 'approve' | 'modify' | 'decline') => {
    setSelectedBooking(booking);
    setActionType(action);
    setFormData({
      scheduledDate: booking.requested_date,
      scheduledTimeWindow: booking.preferred_time_window || '',
      suggestedDate: '',
      modificationReason: '',
      declineReason: '',
      adminNotes: '',
      vehicleId: '',
    });
  };

  const handleSubmit = async () => {
    if (!selectedBooking || !actionType) return;

    await processBooking.mutateAsync({
      bookingRequestId: selectedBooking.id,
      action: actionType,
      scheduledDate: formData.scheduledDate,
      scheduledTimeWindow: formData.scheduledTimeWindow,
      suggestedDate: formData.suggestedDate,
      modificationReason: formData.modificationReason,
      declineReason: formData.declineReason,
      adminNotes: formData.adminNotes,
      vehicleId: formData.vehicleId || undefined,
    });

    setSelectedBooking(null);
    setActionType(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'default', label: 'Pending Review' },
      approved: { variant: 'secondary', label: 'Approved' },
      modified: { variant: 'outline', label: 'Date Modified' },
      declined: { variant: 'destructive', label: 'Declined' },
      cancelled: { variant: 'outline', label: 'Cancelled' },
    };
    const { variant, label } = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const pendingCount = bookingRequests.filter(b => b.status === 'pending').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Booking Requests</h1>
            <p className="text-muted-foreground mt-1">
              Review and manage self-scheduled pickup requests
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {pendingCount} Pending
            </Badge>
          )}
        </div>
      </SlideUp>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="modified">Modified</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : bookingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No {activeTab === 'all' ? '' : activeTab} booking requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bookingRequests.map((booking, index) => (
                <SlideUp key={booking.id} delay={index * 0.05}>
                  <Card className={booking.status === 'pending' ? 'border-primary/50' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {booking.company_name || booking.clients?.company_name || 'New Customer'}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {booking.contact_name}
                            </span>
                            {booking.contact_email && (
                              <span>{booking.contact_email}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(booking.status)}
                          {booking.zone_matched && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                              Zone Match
                            </Badge>
                          )}
                          {booking.detour_distance_miles && booking.detour_distance_miles > 10 && (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {booking.detour_distance_miles.toFixed(1)}mi detour
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Requested: {formatDate(booking.requested_date)}</span>
                          </div>
                          {booking.preferred_time_window && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {booking.preferred_time_window}
                            </div>
                          )}
                          {booking.suggested_date && (
                            <div className="flex items-center gap-2 text-sm text-primary">
                              <CalendarClock className="h-4 w-4" />
                              Suggested: {formatDate(booking.suggested_date)}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p>{booking.pickup_address}</p>
                              <p className="text-muted-foreground">
                                {booking.pickup_city}, {booking.pickup_state} {booking.pickup_zip}
                              </p>
                            </div>
                          </div>
                          {booking.service_zones?.zone_name && (
                            <p className="text-sm text-muted-foreground">
                              Zone: {booking.service_zones.zone_name}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Estimated Tires:</p>
                          <div className="flex gap-2 text-sm">
                            {booking.tire_estimate_pte > 0 && (
                              <Badge variant="outline">{booking.tire_estimate_pte} PTE</Badge>
                            )}
                            {booking.tire_estimate_otr > 0 && (
                              <Badge variant="outline">{booking.tire_estimate_otr} OTR</Badge>
                            )}
                            {booking.tire_estimate_tractor > 0 && (
                              <Badge variant="outline">{booking.tire_estimate_tractor} Tractor</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Value: ~{booking.estimated_value} PTE
                          </p>
                        </div>
                      </div>

                      {booking.notes && (
                        <p className="mt-4 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {booking.notes}
                        </p>
                      )}

                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        {booking.status === 'pending' && (
                          <>
                            <Button 
                              onClick={() => openActionDialog(booking, 'approve')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => openActionDialog(booking, 'modify')}
                            >
                              <CalendarClock className="h-4 w-4 mr-2" />
                              Suggest Date
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={() => openActionDialog(booking, 'decline')}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Decline
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost"
                          size="icon"
                          className="ml-auto text-muted-foreground hover:text-destructive"
                          onClick={() => setBookingToDelete(booking)}
                          title="Delete without notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {booking.admin_notes && (
                        <p className="mt-4 text-sm italic text-muted-foreground">
                          Admin notes: {booking.admin_notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </SlideUp>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!selectedBooking && !!actionType} onOpenChange={() => { setSelectedBooking(null); setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Booking Request'}
              {actionType === 'modify' && 'Suggest Alternative Date'}
              {actionType === 'decline' && 'Decline Booking Request'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === 'approve' && (
              <>
                <div className="space-y-2">
                  <Label>Scheduled Date</Label>
                  <Input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time Window</Label>
                  <Select
                    value={formData.scheduledTimeWindow}
                    onValueChange={(v) => setFormData({ ...formData, scheduledTimeWindow: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time window" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (8am - 12pm)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                      <SelectItem value="anytime">Anytime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign Vehicle (Optional)</Label>
                  <Select
                    value={formData.vehicleId}
                    onValueChange={(v) => setFormData({ ...formData, vehicleId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            {v.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {actionType === 'modify' && (
              <>
                <div className="space-y-2">
                  <Label>Suggested Date</Label>
                  <Input
                    type="date"
                    value={formData.suggestedDate}
                    onChange={(e) => setFormData({ ...formData, suggestedDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reason for Change</Label>
                  <Textarea
                    value={formData.modificationReason}
                    onChange={(e) => setFormData({ ...formData, modificationReason: e.target.value })}
                    placeholder="e.g., We'll be in your area on this date"
                  />
                </div>
              </>
            )}

            {actionType === 'decline' && (
              <div className="space-y-2">
                <Label>Reason for Decline</Label>
                <Textarea
                  value={formData.declineReason}
                  onChange={(e) => setFormData({ ...formData, declineReason: e.target.value })}
                  placeholder="e.g., Outside service area"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Admin Notes (Internal)</Label>
              <Textarea
                value={formData.adminNotes}
                onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
                placeholder="Internal notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedBooking(null); setActionType(null); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={processBooking.isPending}
              className={actionType === 'decline' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {processBooking.isPending ? 'Processing...' : 
                actionType === 'approve' ? 'Approve & Schedule' :
                actionType === 'modify' ? 'Send Suggestion' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!bookingToDelete} onOpenChange={() => setBookingToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Booking Request</DialogTitle>
            <DialogDescription>
              This will permanently delete the booking request without sending any notification to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the booking request from <strong>{bookingToDelete?.company_name || bookingToDelete?.contact_name}</strong>?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingToDelete(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              disabled={deleteBooking.isPending}
              onClick={async () => {
                if (bookingToDelete) {
                  await deleteBooking.mutateAsync(bookingToDelete.id);
                  setBookingToDelete(null);
                }
              }}
            >
              {deleteBooking.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
