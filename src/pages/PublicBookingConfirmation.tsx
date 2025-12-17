import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Truck, User, Calendar, Building2, Phone, Mail, Hourglass, CheckCircle } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";

interface PublicConfirmationData {
  success: boolean;
  bookingRequestId: string;
  status: string;
  message: string;
  contact: {
    name: string;
    company: string;
    email: string;
  };
  location: {
    address: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  requestedDate: string;
  preferredWindow: string;
  tireEstimates: {
    pte: number;
    otr: number;
    tractor: number;
  };
  zoneMatched: boolean;
  zoneName?: string;
  suggestedDates?: string[];
}

export default function PublicBookingConfirmation() {
  const [searchParams] = useSearchParams();
  const [confirmationData, setConfirmationData] = useState<PublicConfirmationData | null>(null);
  
  useEffect(() => {
    document.title = "Request Submitted – TreadSet Tire Collection";
    
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
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const windowLabels: Record<string, string> = {
    'AM': 'Morning (8 AM - 12 PM)',
    'PM': 'Afternoon (12 PM - 5 PM)',
    'Any': 'Anytime (8 AM - 5 PM)'
  };

  return (
    <main className="min-h-screen bg-background">
      <BrandHeader />
      
      <div className="container py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Pending Status Header */}
          <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Hourglass className="h-16 w-16 text-amber-600 mx-auto" />
                <h1 className="text-2xl font-semibold text-foreground">Request Submitted!</h1>
                <p className="text-muted-foreground">
                  Your pickup request has been submitted and is pending review by our team.
                </p>
                <p className="text-sm text-muted-foreground">
                  You'll receive an email confirmation once your request is approved.
                </p>
                <div className="pt-2">
                  <Badge variant="secondary" className="text-sm bg-amber-100 text-amber-800 border-amber-300">
                    Reference: {confirmationData.bookingRequestId.slice(0, 8).toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What Happens Next */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                What Happens Next
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">1</div>
                  <div>
                    <p className="font-medium">Review</p>
                    <p className="text-sm text-muted-foreground">Our team will review your request within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">2</div>
                  <div>
                    <p className="font-medium">Confirmation</p>
                    <p className="text-sm text-muted-foreground">You'll receive an email with your confirmed pickup date and time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">3</div>
                  <div>
                    <p className="font-medium">Pickup</p>
                    <p className="text-sm text-muted-foreground">Our driver will arrive at the scheduled time to collect your tires</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Location Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{confirmationData.contact.name}</p>
                      <p className="text-sm text-muted-foreground">{confirmationData.contact.company}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{confirmationData.contact.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Pickup Address</p>
                      <p className="text-sm text-muted-foreground">{confirmationData.location.address}</p>
                    </div>
                  </div>

                  {confirmationData.zoneMatched && confirmationData.zoneName && (
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">In service zone: {confirmationData.zoneName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Requested Date</p>
                      <p className="text-sm text-muted-foreground">{formatDate(confirmationData.requestedDate)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{windowLabels[confirmationData.preferredWindow] || confirmationData.preferredWindow}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Tire Estimates</p>
                    <div className="space-y-2">
                      {confirmationData.tireEstimates.pte > 0 && (
                        <div className="flex justify-between text-sm p-2 bg-muted rounded">
                          <span>Passenger/Light Truck:</span>
                          <span className="font-medium">{confirmationData.tireEstimates.pte}</span>
                        </div>
                      )}
                      {confirmationData.tireEstimates.otr > 0 && (
                        <div className="flex justify-between text-sm p-2 bg-muted rounded">
                          <span>OTR (Off-Road):</span>
                          <span className="font-medium">{confirmationData.tireEstimates.otr}</span>
                        </div>
                      )}
                      {confirmationData.tireEstimates.tractor > 0 && (
                        <div className="flex justify-between text-sm p-2 bg-muted rounded">
                          <span>Tractor Trailer:</span>
                          <span className="font-medium">{confirmationData.tireEstimates.tractor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link to="/public-book">Submit Another Request</Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <a href="mailto:bsgtires@gmail.com">Contact Support</a>
            </Button>
          </div>

          {/* Contact Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground">
                <p className="mb-2">Have questions about your request?</p>
                <p>Contact us at <a href="mailto:bsgtires@gmail.com" className="font-medium text-primary hover:underline">bsgtires@gmail.com</a> or <a href="tel:+13137310817" className="font-medium text-primary hover:underline">313-731-0817</a></p>
                <p className="text-xs mt-2">Reference: {confirmationData.bookingRequestId.slice(0, 8).toUpperCase()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
