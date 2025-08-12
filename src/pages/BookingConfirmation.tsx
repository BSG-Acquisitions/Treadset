import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, MapPin, Truck, User, Calendar } from "lucide-react";

interface ConfirmationData {
  success: boolean;
  bookingId: string;
  client: {
    name: string;
    company: string;
    email: string;
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

export default function BookingConfirmation() {
  const [searchParams] = useSearchParams();
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
  
  useEffect(() => {
    document.title = "Booking Confirmed – BSG";
    
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
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Loading confirmation details...</p>
            </div>
          </CardContent>
        </Card>
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
      <div className="container py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success Header */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <CheckCircle className="h-16 w-16 text-primary mx-auto" />
                <h1 className="text-2xl font-semibold text-foreground">Pickup Scheduled Successfully!</h1>
                <p className="text-muted-foreground">
                  Your pickup has been confirmed and assigned to our route.
                </p>
                <div className="pt-2">
                  <Badge variant="secondary" className="text-sm">
                    Booking ID: {confirmationData.bookingId.slice(0, 8)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Pickup Details
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
                      <p className="text-sm text-muted-foreground">{confirmationData.client.email}</p>
                    </div>
                  </div>
                  
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
                    <p className="text-sm font-medium mb-2">Tire Counts</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">{confirmationData.pickup.pteCount}</div>
                        <div className="text-muted-foreground">PTE</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">{confirmationData.pickup.otrCount}</div>
                        <div className="text-muted-foreground">OTR</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">{confirmationData.pickup.tractorCount}</div>
                        <div className="text-muted-foreground">Tractor</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Assigned Vehicle & Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="space-y-1">
                  <p className="font-medium">{confirmationData.assignment.vehicleName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(confirmationData.pickup.date)}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{formatTime(confirmationData.assignment.eta)}</span>
                  </div>
                  <Badge variant="outline">
                    {confirmationData.assignment.windowLabel}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alternative Options */}
          {confirmationData.allOptions && confirmationData.allOptions.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alternative Time Slots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {confirmationData.allOptions.slice(1, 4).map((option, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{option.vehicleName}</p>
                        <p className="text-xs text-muted-foreground">
                          +{option.addedTravelTimeMinutes} min travel time
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatTime(option.eta)}</p>
                        <Badge variant="secondary" className="text-xs">
                          {option.windowLabel}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link to="/book">Schedule Another Pickup</Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>

          {/* Contact Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground">
                <p>Questions about your pickup?</p>
                <p>Contact us at <span className="font-medium">support@bsglogistics.com</span> or <span className="font-medium">(555) 123-4567</span></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}