import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Check, Clock, Loader2 } from "lucide-react";
import { useSendPortalInvite, useClientInviteStatus } from "@/hooks/usePortalInvites";
import { formatDistanceToNow } from "date-fns";

interface SendPortalInviteButtonProps {
  clientId: string;
  clientEmail: string | null;
  companyName: string;
}

export function SendPortalInviteButton({ 
  clientId, 
  clientEmail, 
  companyName 
}: SendPortalInviteButtonProps) {
  const { data: inviteStatus, isLoading: statusLoading } = useClientInviteStatus(clientId);
  const sendInvite = useSendPortalInvite();

  const handleSendInvite = () => {
    sendInvite.mutate([clientId]);
  };

  if (!clientEmail) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No email on file
      </Badge>
    );
  }

  if (statusLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Client has signed up
  if (inviteStatus?.used_at) {
    return (
      <Badge variant="default" className="bg-green-600">
        <Check className="h-3 w-3 mr-1" />
        Portal Active
      </Badge>
    );
  }

  // Invite sent but not used
  if (inviteStatus) {
    const isExpired = new Date(inviteStatus.expires_at) < new Date();
    
    if (isExpired) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            <Clock className="h-3 w-3 mr-1" />
            Invite Expired
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSendInvite}
            disabled={sendInvite.isPending}
          >
            {sendInvite.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Resend
          </Button>
        </div>
      );
    }

    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Invited {formatDistanceToNow(new Date(inviteStatus.created_at), { addSuffix: true })}
      </Badge>
    );
  }

  // Not yet invited
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleSendInvite}
      disabled={sendInvite.isPending}
    >
      {sendInvite.isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Mail className="h-4 w-4 mr-2" />
      )}
      Send Portal Invite
    </Button>
  );
}
