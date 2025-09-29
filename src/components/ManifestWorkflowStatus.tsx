import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, FileText, Mail, Signature, User, Truck } from "lucide-react";
import { format } from "date-fns";

interface ManifestWorkflowStatusProps {
  manifest: {
    id: string;
    manifest_number?: string;
    status: string;
    signed_at?: string;
    generator_signed_at?: string;
    hauler_signed_at?: string;
    receiver_signed_at?: string;
    acroform_pdf_path?: string;
    client?: {
      company_name: string;
      email?: string;
    };
    pickup?: {
      pickup_date: string;
    };
  };
  onSendEmail?: (manifestId: string) => void;
  onCompleteReceiver?: (manifestId: string) => void;
}

export function ManifestWorkflowStatus({ 
  manifest, 
  onSendEmail, 
  onCompleteReceiver 
}: ManifestWorkflowStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return 'default';
      case 'AWAITING_RECEIVER_SIGNATURE': return 'secondary';
      case 'DRAFT': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return CheckCircle2;
      case 'AWAITING_RECEIVER_SIGNATURE': return Clock;
      default: return AlertCircle;
    }
  };

  const StatusIcon = getStatusIcon(manifest.status);

  const formatDateTime = (timestamp?: string) => {
    if (!timestamp) return 'Not signed';
    try {
      return format(new Date(timestamp), 'MMM d, yyyy \'at\' h:mm:ss a');
    } catch {
      return 'Invalid timestamp';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>Manifest {manifest.manifest_number || manifest.id.substring(0, 8)}</span>
            <Badge variant={getStatusColor(manifest.status)}>
              {manifest.status?.replace('_', ' ')}
            </Badge>
          </div>
          <StatusIcon className={`h-5 w-5 ${
            manifest.status === 'COMPLETED' ? 'text-green-500' : 'text-yellow-500'
          }`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client Info */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{manifest.client?.company_name || 'Unknown Client'}</span>
          {manifest.client?.email && (
            <span className="text-muted-foreground">({manifest.client.email})</span>
          )}
        </div>

        {/* Pickup Date */}
        {manifest.pickup?.pickup_date && (
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span>Pickup: {format(new Date(manifest.pickup.pickup_date), 'MMM d, yyyy')}</span>
          </div>
        )}

        {/* Signature Timeline */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Signature className="h-4 w-4" />
            Signature Timeline
          </h4>
          
          <div className="space-y-2 pl-6">
            {/* Generator Signature */}
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                manifest.generator_signed_at ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Generator Signed</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(manifest.generator_signed_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Hauler/Driver Signature */}
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                manifest.hauler_signed_at ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Driver Signed</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(manifest.hauler_signed_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Receiver Signature */}
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                manifest.receiver_signed_at ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Receiver Signed</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(manifest.receiver_signed_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {manifest.status === 'AWAITING_RECEIVER_SIGNATURE' && onCompleteReceiver && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onCompleteReceiver(manifest.id)}
              className="gap-2"
            >
              <Signature className="h-4 w-4" />
              Complete Receiver Signature
            </Button>
          )}
          
          {manifest.acroform_pdf_path && onSendEmail && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onSendEmail(manifest.id)}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </Button>
          )}
        </div>

        {/* Workflow Status Messages */}
        <div className="text-xs text-muted-foreground space-y-1">
          {manifest.status === 'AWAITING_RECEIVER_SIGNATURE' && (
            <p className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Driver has completed pickup. Waiting for receiver to sign.
            </p>
          )}
          {manifest.status === 'COMPLETED' && (
            <p className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              All signatures collected. Manifest completed and emailed to client.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}