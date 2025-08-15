import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, MapPin, Truck, User, Calendar, Building2, Phone, Mail } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";

interface PublicConfirmationData {
  success: boolean;
  bookingId: string;
  client: {
    name: string;
    company: string;
    email: string;
    phone?: string;
  };
  location: {
    address: string;
  };
  pickup: {
    date: string;
    pteCount: number;
    otrCount: number;
    tractorCount: number;
  };
  assignment: {
    vehicleName: string;
    eta: string;
    windowLabel: string;
  };
  allOptions: Array<{
    vehicleName: string;
    eta: string;
    windowLabel: string;
    addedTravelTimeMinutes: number;
  }>;
}

export default function PublicBookingConfirmation() {
  const [searchParams] = useSearchParams();
  const [confirmationData, setConfirmationData] = useState<PublicConfirmationData | null>(null);
  
  useEffect(() => {
    document.title = "Pickup Confirmed – BSG Tire Collection";
    
    // Get confirmation data from URL params
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const data = JSON.parse(decodeURIComponent(dataParam));
        setConfirmationData(data);
      } catch (error) {
        console.error('Error parsing confirmation data:', error);
      }
    }
  }, [searchParams]);

  if (!confirmationData) {
    return (
      <main className="min-h-screen bg-background">
        <BrandHeader />
        <div className="container py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="w-full">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground">Loading confirmation details...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <BrandHeader />
      
      <div className="container py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success Header */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <CheckCircle className="h-16 w-16 text-primary mx-auto" />
                <h1 className="text-2xl font-semibold text-foreground">Pickup Confirmed!</h1>
                <p className="text-muted-foreground">
                  Your tire pickup has been scheduled and our driver will arrive at the confirmed time.
                </p>
                <div className="pt-2">
                  <Badge variant="secondary" className="text-sm">
                    Confirmation: {confirmationData.bookingId.slice(0, 8).toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Location Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Pickup Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{confirmationData.client.name}</p>
                      <p className="text-sm text-muted-foreground">{confirmationData.client.company}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{confirmationData.client.email}</p>
                    </div>
                  </div>

                  {confirmationData.client.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">{confirmationData.client.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Pickup Address</p>
                      <p className="text-sm text-muted-foreground">{confirmationData.location.address}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Tire Quantities</p>
                    <div className="space-y-2">
                      {confirmationData.pickup.pteCount > 0 && (
                        <div className="flex justify-between text-sm p-2 bg-muted rounded">
                          <span>Passenger/Light Truck:</span>
                          <span className="font-medium">{confirmationData.pickup.pteCount}</span>
                        </div>
                      )}
                      {confirmationData.pickup.otrCount > 0 && (
                        <div className="flex justify-between text-sm p-2 bg-muted rounded">
                          <span>OTR (Off-Road):</span>
                          <span className="font-medium">{confirmationData.pickup.otrCount}</span>
                        </div>
                      )}
                      {confirmationData.pickup.tractorCount > 0 && (
                        <div className="flex justify-between text-sm p-2 bg-muted rounded">
                          <span>Tractor Trailer:</span>
                          <span className="font-medium">{confirmationData.pickup.tractorCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Pickup */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Scheduled Pickup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="space-y-1">
                  <p className="font-medium text-lg">{confirmationData.assignment.vehicleName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(confirmationData.pickup.date)}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium text-lg">{formatTime(confirmationData.assignment.eta)}</span>
                  </div>
                  <Badge variant="outline" className="border-primary text-primary">
                    {confirmationData.assignment.windowLabel}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Please note:</strong> Our driver will arrive within a 30-minute window of the scheduled time. 
                  Please ensure someone is available to assist with the pickup.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* What to Expect */}
          <Card>
            <CardHeader>
              <CardTitle>What to Expect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p>Our driver will contact you when they're on their way</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p>Please have your tires accessible and ready for pickup</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p>Our driver will provide a receipt and calculate any fees on-site</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p>Payment can be made by cash, check, or card</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link to="/public-book">Schedule Another Pickup</Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <a href="mailto:support@bsglogistics.com">Contact Support</a>
            </Button>
          </div>

          {/* Contact Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground">
                <p className="mb-2">Need to modify or cancel your pickup?</p>
                <p>Contact us at <span className="font-medium">support@bsglogistics.com</span> or <span className="font-medium">(555) 123-4567</span></p>
                <p className="text-xs mt-2">Reference confirmation: {confirmationData.bookingId.slice(0, 8).toUpperCase()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}