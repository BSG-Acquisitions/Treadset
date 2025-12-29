import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Mail, Users, UserCheck, UserX, Clock, Check, Send, Loader2, 
  AlertCircle, RefreshCw, Eye, MousePointerClick, Bell
} from "lucide-react";
import { 
  usePortalInvites, 
  usePortalInviteStats, 
  useSendPortalInvite, 
  useSendBulkPortalInvites,
  useSendInviteReminders
} from "@/hooks/usePortalInvites";
import { formatDistanceToNow, format } from "date-fns";
import { FadeIn } from "@/components/motion/FadeIn";
import { SlideUp } from "@/components/motion/SlideUp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PortalInvites() {
  const { data: invites, isLoading: invitesLoading, refetch: refetchInvites } = usePortalInvites();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = usePortalInviteStats();
  const sendInvite = useSendPortalInvite();
  const sendBulkInvites = useSendBulkPortalInvites();
  const sendReminders = useSendInviteReminders();

  useEffect(() => {
    document.title = "Portal Invites – TreadSet";
  }, []);

  const handleResendInvite = (clientId: string) => {
    sendInvite.mutate([clientId]);
  };

  const handleSendToAllUninvited = () => {
    sendBulkInvites.mutate();
  };

  const handleSendReminders = () => {
    sendReminders.mutate(false);
  };

  const getInviteStatus = (invite: any) => {
    if (invite.used_at) {
      return { label: "Signed Up", variant: "default" as const, icon: Check };
    }
    if (new Date(invite.expires_at) < new Date()) {
      return { label: "Expired", variant: "outline" as const, icon: Clock };
    }
    if (invite.clicked_at) {
      return { label: "Clicked", variant: "secondary" as const, icon: MousePointerClick };
    }
    if (invite.opened_at) {
      return { label: "Opened", variant: "secondary" as const, icon: Eye };
    }
    return { label: "Pending", variant: "secondary" as const, icon: Clock };
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 pb-8 pt-8">
        <FadeIn>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Portal Invites</h1>
            <p className="text-muted-foreground mt-2">
              Manage client portal invitations and track signups
            </p>
          </div>
        </FadeIn>

        {/* Stats Cards */}
        <SlideUp delay={0.1}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsLoading ? "..." : stats?.totalClientsWithEmail || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsLoading ? "..." : stats?.alreadyInvited || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Eye className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsLoading ? "..." : stats?.opened || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Opened</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <MousePointerClick className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsLoading ? "..." : stats?.clicked || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Clicked</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <UserCheck className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsLoading ? "..." : stats?.signedUp || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Signed Up</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsLoading ? "..." : stats?.notYetInvited || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Not Invited</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <UserX className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsLoading ? "..." : stats?.optedOut || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Opted Out</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SlideUp>

        {/* Bulk Actions */}
        <SlideUp delay={0.2}>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Bulk Actions
              </CardTitle>
              <CardDescription>
                Send portal invitations to multiple clients at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={sendBulkInvites.isPending || (stats?.notYetInvited || 0) === 0}
                    >
                      {sendBulkInvites.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Send to All Uninvited Clients
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Send Portal Invites?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will send portal invitation emails to {stats?.notYetInvited || 0} clients 
                        who haven't been invited yet. Clients who have opted out will be skipped.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSendToAllUninvited}>
                        Send {stats?.notYetInvited || 0} Invites
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="secondary"
                      disabled={sendReminders.isPending}
                    >
                      {sendReminders.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Bell className="h-4 w-4 mr-2" />
                      )}
                      Send Reminders
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Send Follow-up Reminders?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will send automated reminder emails to clients who:
                        <ul className="list-disc ml-4 mt-2 space-y-1">
                          <li>Received an invite 7+ days ago but haven't signed up (Day 7 reminder)</li>
                          <li>Already got a Day 7 reminder but still haven't signed up (Day 14 reminder)</li>
                        </ul>
                        <p className="mt-2">Clients who opted out or are inactive will be skipped.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSendReminders}>
                        Send Reminders
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    refetchInvites();
                    refetchStats();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>

                {(stats?.notYetInvited || 0) === 0 && (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    <Check className="h-3 w-3 mr-1" />
                    All clients invited!
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </SlideUp>

        {/* Invite History */}
        <SlideUp delay={0.3}>
          <Card>
            <CardHeader>
              <CardTitle>Invite History</CardTitle>
              <CardDescription>
                All portal invitations sent to clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : invites && invites.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Reminders</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => {
                      const status = getInviteStatus(invite);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">
                            {invite.client?.company_name || "Unknown"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {invite.sent_to_email || invite.client?.email || "-"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invite.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {invite.reminder_count === 0 && (
                              <Badge variant="outline" className="text-muted-foreground">None</Badge>
                            )}
                            {invite.reminder_count === 1 && (
                              <Badge variant="secondary">Day 7</Badge>
                            )}
                            {(invite.reminder_count || 0) >= 2 && (
                              <Badge variant="default">Day 14</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {!invite.used_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendInvite(invite.client_id)}
                                disabled={sendInvite.isPending}
                              >
                                {sendInvite.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="ml-2">Resend</span>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">No invites sent yet</h3>
                  <p className="text-muted-foreground mt-1">
                    Use the bulk action above to send portal invites to your clients
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </SlideUp>
      </main>
    </div>
  );
}
