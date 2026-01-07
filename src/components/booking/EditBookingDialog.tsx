import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookingRequest, useUpdateBookingRequest } from '@/hooks/useBookingRequests';
import { AlertCircle } from 'lucide-react';

interface EditBookingDialogProps {
  booking: BookingRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBookingDialog({ booking, open, onOpenChange }: EditBookingDialogProps) {
  const updateBooking = useUpdateBookingRequest();
  
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    pickup_address: '',
    pickup_city: '',
    pickup_state: '',
    pickup_zip: '',
    requested_date: '',
    // New tire fields
    tire_estimate_passenger_off_rim: 0,
    tire_estimate_passenger_on_rim: 0,
    tire_estimate_semi: 0,
    tire_estimate_oversized: 0,
    // Legacy fields
    tire_estimate_pte: 0,
    tire_estimate_otr: 0,
    tire_estimate_tractor: 0,
    notes: '',
  });

  const [emailError, setEmailError] = useState('');

  // Populate form when booking changes
  useEffect(() => {
    if (booking) {
      setFormData({
        company_name: booking.company_name || '',
        contact_name: booking.contact_name || '',
        contact_email: booking.contact_email || '',
        contact_phone: booking.contact_phone || '',
        pickup_address: booking.pickup_address || '',
        pickup_city: booking.pickup_city || '',
        pickup_state: booking.pickup_state || '',
        pickup_zip: booking.pickup_zip || '',
        requested_date: booking.requested_date || '',
        // New tire fields
        tire_estimate_passenger_off_rim: (booking as any).tire_estimate_passenger_off_rim || 0,
        tire_estimate_passenger_on_rim: (booking as any).tire_estimate_passenger_on_rim || 0,
        tire_estimate_semi: (booking as any).tire_estimate_semi || 0,
        tire_estimate_oversized: (booking as any).tire_estimate_oversized || 0,
        // Legacy fields
        tire_estimate_pte: booking.tire_estimate_pte || 0,
        tire_estimate_otr: booking.tire_estimate_otr || 0,
        tire_estimate_tractor: booking.tire_estimate_tractor || 0,
        notes: booking.notes || '',
      });
      setEmailError('');
    }
  }, [booking]);

  const validateEmail = (email: string) => {
    if (!email) return true; // Empty is OK
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setFormData({ ...formData, contact_email: value });
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  // Calculate PTE from new fields
  const calculatedPte = 
    formData.tire_estimate_passenger_off_rim + 
    formData.tire_estimate_passenger_on_rim + 
    (formData.tire_estimate_semi * 5) + 
    (formData.tire_estimate_oversized * 15);

  const handleSubmit = async () => {
    if (!booking) return;
    
    if (formData.contact_email && !validateEmail(formData.contact_email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    await updateBooking.mutateAsync({
      bookingRequestId: booking.id,
      updates: {
        company_name: formData.company_name || null,
        contact_name: formData.contact_name,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        pickup_address: formData.pickup_address,
        pickup_city: formData.pickup_city || null,
        pickup_state: formData.pickup_state || null,
        pickup_zip: formData.pickup_zip || null,
        requested_date: formData.requested_date,
        // Update legacy fields from new fields for backward compatibility
        tire_estimate_pte: formData.tire_estimate_passenger_off_rim + formData.tire_estimate_passenger_on_rim,
        tire_estimate_otr: formData.tire_estimate_oversized,
        tire_estimate_tractor: 0, // Deprecated
        notes: formData.notes || null,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking Request</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Company & Contact Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g., Motor City Contracting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className={emailError ? 'border-destructive' : ''}
              />
              {emailError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {emailError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
          </div>

          {/* Requested Date */}
          <div className="space-y-2">
            <Label htmlFor="requested_date">Requested Pickup Date</Label>
            <Input
              id="requested_date"
              type="date"
              value={formData.requested_date}
              onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Change the date before approving if the driver prefers a different day
            </p>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="pickup_address">Pickup Address</Label>
            <Input
              id="pickup_address"
              value={formData.pickup_address}
              onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickup_city">City</Label>
              <Input
                id="pickup_city"
                value={formData.pickup_city}
                onChange={(e) => setFormData({ ...formData, pickup_city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup_state">State</Label>
              <Input
                id="pickup_state"
                value={formData.pickup_state}
                onChange={(e) => setFormData({ ...formData, pickup_state: e.target.value })}
                maxLength={2}
                placeholder="MI"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup_zip">ZIP</Label>
              <Input
                id="pickup_zip"
                value={formData.pickup_zip}
                onChange={(e) => setFormData({ ...formData, pickup_zip: e.target.value })}
              />
            </div>
          </div>

          {/* Tire Estimates - New Categories */}
          <div className="space-y-4 pt-2">
            <Label className="text-base font-semibold">Tire Estimates</Label>
            
            {/* Passenger Tires */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tire_passenger_off" className="text-sm text-muted-foreground">
                  🚗 Passenger (Off-Rim)
                </Label>
                <Input
                  id="tire_passenger_off"
                  type="number"
                  min="0"
                  value={formData.tire_estimate_passenger_off_rim}
                  onChange={(e) => setFormData({ ...formData, tire_estimate_passenger_off_rim: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tire_passenger_on" className="text-sm text-muted-foreground">
                  🚗 Passenger (On-Rim)
                </Label>
                <Input
                  id="tire_passenger_on"
                  type="number"
                  min="0"
                  value={formData.tire_estimate_passenger_on_rim}
                  onChange={(e) => setFormData({ ...formData, tire_estimate_passenger_on_rim: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Commercial & Large */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tire_semi" className="text-sm text-muted-foreground">
                  🚛 Semi / Truck Tires
                </Label>
                <Input
                  id="tire_semi"
                  type="number"
                  min="0"
                  value={formData.tire_estimate_semi}
                  onChange={(e) => setFormData({ ...formData, tire_estimate_semi: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tire_oversized" className="text-sm text-muted-foreground">
                  🚜 OTR / Tractor / Heavy Equipment
                </Label>
                <Input
                  id="tire_oversized"
                  type="number"
                  min="0"
                  value={formData.tire_estimate_oversized}
                  onChange={(e) => setFormData({ ...formData, tire_estimate_oversized: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* PTE Summary */}
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <span className="font-medium">Estimated PTE: </span>
              <span className={calculatedPte >= 50 ? 'text-green-600' : 'text-destructive'}>
                {calculatedPte}
              </span>
              <span className="text-muted-foreground ml-2">
                (Passenger: 1:1, Semi: 5:1, OTR: 15:1)
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateBooking.isPending || !!emailError}
          >
            {updateBooking.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
