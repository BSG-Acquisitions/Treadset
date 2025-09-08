import { useState } from "react";
import { MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface AddressValidationDialogProps {
  trigger: React.ReactNode;
  addresses: Array<{
    clientName: string;
    address: string;
    hasCoordinates: boolean;
    accessNotes?: string;
  }>;
}

export function AddressValidationDialog({ trigger, addresses }: AddressValidationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const validAddresses = addresses.filter(addr => addr.hasCoordinates && addr.address);
  const invalidAddresses = addresses.filter(addr => !addr.hasCoordinates || !addr.address);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address Validation Check
          </DialogTitle>
          <DialogDescription>
            Review all route addresses before dispatching drivers. Ensure locations are accurate and complete.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="flex gap-4">
            <Card className="flex-1">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{validAddresses.length} Valid</p>
                    <p className="text-xs text-muted-foreground">Complete addresses with GPS</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">{invalidAddresses.length} Issues</p>
                    <p className="text-xs text-muted-foreground">Missing address or GPS</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Valid Addresses */}
          {validAddresses.length > 0 && (
            <div>
              <h3 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Verified Addresses ({validAddresses.length})
              </h3>
              <div className="space-y-2">
                {validAddresses.map((addr, index) => (
                  <div key={index} className="p-3 border border-green-200 bg-green-50/50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{addr.clientName}</p>
                        <p className="text-sm text-gray-600">{addr.address}</p>
                        {addr.accessNotes && (
                          <p className="text-xs text-gray-500 mt-1">
                            <strong>Access:</strong> {addr.accessNotes}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        GPS ✓
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invalid Addresses */}
          {invalidAddresses.length > 0 && (
            <div>
              <h3 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Needs Attention ({invalidAddresses.length})
              </h3>
              <div className="space-y-2">
                {invalidAddresses.map((addr, index) => (
                  <div key={index} className="p-3 border border-orange-200 bg-orange-50/50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{addr.clientName}</p>
                        <p className="text-sm text-gray-600">
                          {addr.address || "No address provided"}
                        </p>
                        {!addr.hasCoordinates && (
                          <p className="text-xs text-orange-600 mt-1">
                            ⚠️ Missing GPS coordinates - driver may have difficulty finding location
                          </p>
                        )}
                      </div>
                      <Badge variant="destructive" className="bg-orange-100 text-orange-800">
                        {!addr.address ? "No Address" : "No GPS"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Review Later
            </Button>
            <Button 
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={invalidAddresses.length > 0}
            >
              {invalidAddresses.length > 0 ? "Fix Issues First" : "Addresses Confirmed ✓"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}