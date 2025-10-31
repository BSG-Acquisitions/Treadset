import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface EmailDeliveryStatusProps {
  emailStatus?: string | null;
  emailSentAt?: string | null;
  emailSentTo?: string[] | null;
  emailError?: string | null;
  className?: string;
}

export const EmailDeliveryStatus = ({ 
  emailStatus, 
  emailSentAt, 
  emailSentTo,
  emailError,
  className = "" 
}: EmailDeliveryStatusProps) => {
  if (!emailStatus || emailStatus === 'not_sent') {
    return (
      <Badge variant="secondary" className={className}>
        <Mail className="h-3 w-3 mr-1" />
        Not Sent
      </Badge>
    );
  }

  const getStatusDisplay = () => {
    switch (emailStatus) {
      case 'sent':
        return {
          icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
          label: 'Email Sent',
          variant: 'default' as const,
          color: 'bg-green-500 hover:bg-green-600'
        };
      case 'delivered':
        return {
          icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
          label: 'Delivered',
          variant: 'default' as const,
          color: 'bg-green-600 hover:bg-green-700'
        };
      case 'bounced':
        return {
          icon: <XCircle className="h-3 w-3 mr-1" />,
          label: 'Bounced',
          variant: 'destructive' as const,
          color: ''
        };
      case 'failed':
        return {
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
          label: 'Failed',
          variant: 'destructive' as const,
          color: ''
        };
      default:
        return {
          icon: <Clock className="h-3 w-3 mr-1" />,
          label: 'Pending',
          variant: 'secondary' as const,
          color: ''
        };
    }
  };

  const status = getStatusDisplay();
  
  const tooltipContent = (
    <div className="space-y-2 text-xs">
      {emailSentAt && (
        <div>
          <strong>Sent:</strong> {format(new Date(emailSentAt), 'MMM d, yyyy h:mm a')}
        </div>
      )}
      {emailSentTo && emailSentTo.length > 0 && (
        <div>
          <strong>Recipients:</strong>
          <div className="mt-1 space-y-1">
            {emailSentTo.map((email, idx) => (
              <div key={idx} className="text-muted-foreground">{email}</div>
            ))}
          </div>
        </div>
      )}
      {emailError && (
        <div className="text-red-400">
          <strong>Error:</strong> {emailError}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={status.variant} 
            className={`${status.color} ${className} cursor-help`}
          >
            {status.icon}
            {status.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
