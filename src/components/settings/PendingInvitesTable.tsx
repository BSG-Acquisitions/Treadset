import { format, formatDistanceToNow, isPast } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, QrCode, RefreshCw, X, Check, Clock } from "lucide-react";
import { useOrganizationInvites, useResendInvite, useCancelInvite, OrganizationInvite } from "@/hooks/useOrganizationInvites";

const ROLE_LABELS: Record<string, string> = {
  driver: "Driver",
  dispatcher: "Dispatcher",
  ops_manager: "Ops Manager",
  admin: "Administrator",
  sales: "Sales",
};

export function PendingInvitesTable() {
  const { data: invites, isLoading } = useOrganizationInvites();
  const resendInvite = useResendInvite();
  const cancelInvite = useCancelInvite();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invites?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No pending invitations</p>
      </div>
    );
  }

  const getStatus = (invite: OrganizationInvite): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (invite.used_at) return { label: "Accepted", variant: "default" };
    if (isPast(new Date(invite.expires_at))) return { label: "Expired", variant: "destructive" };
    return { label: "Pending", variant: "secondary" };
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Email / Recipient</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invites.map((invite) => {
          const status = getStatus(invite);
          const isActive = !invite.used_at && !isPast(new Date(invite.expires_at));

          return (
            <TableRow key={invite.id}>
              <TableCell>
                {invite.invite_type === "email" ? (
                  <Mail className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                )}
              </TableCell>
              <TableCell>
                {invite.email || (
                  <span className="text-muted-foreground italic">Open QR invite</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{ROLE_LABELS[invite.role] || invite.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={status.variant}>
                  {status.label === "Accepted" && <Check className="h-3 w-3 mr-1" />}
                  {status.label === "Pending" && <Clock className="h-3 w-3 mr-1" />}
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {isPast(new Date(invite.expires_at)) ? (
                  "Expired"
                ) : (
                  formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })
                )}
              </TableCell>
              <TableCell className="text-right">
                {isActive && (
                  <div className="flex justify-end gap-2">
                    {invite.invite_type === "email" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resendInvite.mutate(invite)}
                        disabled={resendInvite.isPending}
                      >
                        {resendInvite.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelInvite.mutate(invite.id)}
                      disabled={cancelInvite.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      {cancelInvite.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
