import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Mail, QrCode, Loader2, Copy, Download, Check } from "lucide-react";
import { useSendEmailInvite, useCreateQRInvite } from "@/hooks/useOrganizationInvites";
import { useAuth } from "@/contexts/AuthContext";
import { QRCodeSVG } from "qrcode.react";

const ROLES = [
  { value: "driver", label: "Driver", description: "Can complete pickups and manifests" },
  { value: "dispatcher", label: "Dispatcher", description: "Can manage routes and assignments" },
  { value: "ops_manager", label: "Operations Manager", description: "Full operational access" },
  { value: "admin", label: "Administrator", description: "Full access including settings" },
  { value: "sales", label: "Sales", description: "Can manage clients and bookings" },
];

interface InviteTeamDialogProps {
  trigger?: React.ReactNode;
}

export function InviteTeamDialog({ trigger }: InviteTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"email" | "qr">("email");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("driver");
  const [message, setMessage] = useState("");
  const [generatedQR, setGeneratedQR] = useState<{ token: string; role: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { user } = useAuth();
  const sendEmailInvite = useSendEmailInvite();
  const createQRInvite = useCreateQRInvite();

  const appUrl = window.location.origin;
  const orgName = user?.currentOrganization?.name || "your organization";

  const handleSendEmail = async () => {
    await sendEmailInvite.mutateAsync({ email, role, personal_message: message || undefined });
    setEmail("");
    setMessage("");
    setOpen(false);
  };

  const handleGenerateQR = async () => {
    const result = await createQRInvite.mutateAsync({ role });
    setGeneratedQR({ token: result.token, role });
  };

  const inviteUrl = generatedQR ? `${appUrl}/invite/${generatedQR.token}` : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("invite-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `treadset-invite-${role}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const resetForm = () => {
    setEmail("");
    setRole("driver");
    setMessage("");
    setGeneratedQR(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-[#1A4314] hover:bg-[#2d5a24]">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Team Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Add a new member to {orgName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as "email" | "qr"); setGeneratedQR(null); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Invite
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex flex-col">
                        <span>{r.label}</span>
                        <span className="text-xs text-muted-foreground">{r.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal note to the invitation..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleSendEmail}
              disabled={!email || sendEmailInvite.isPending}
              className="w-full bg-[#1A4314] hover:bg-[#2d5a24]"
            >
              {sendEmailInvite.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4 mt-4">
            {!generatedQR ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="qr-role">Role for QR Code</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <div className="flex flex-col">
                            <span>{r.label}</span>
                            <span className="text-xs text-muted-foreground">{r.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-sm text-muted-foreground">
                  Generate a QR code that anyone can scan to join as a {ROLES.find((r) => r.value === role)?.label}. 
                  QR codes expire after 30 days.
                </p>

                <Button
                  onClick={handleGenerateQR}
                  disabled={createQRInvite.isPending}
                  className="w-full bg-[#1A4314] hover:bg-[#2d5a24]"
                >
                  {createQRInvite.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-2" />
                  )}
                  Generate QR Code
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center p-6 bg-white rounded-lg border">
                  <QRCodeSVG
                    id="invite-qr-code"
                    value={inviteUrl}
                    size={200}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#1A4314"
                  />
                  <p className="mt-4 text-center font-medium">
                    Scan to join as {ROLES.find((r) => r.value === generatedQR.role)?.label}
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    {orgName}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
                    {copied ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleDownloadQR}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>

                <Button variant="ghost" className="w-full" onClick={() => setGeneratedQR(null)}>
                  Generate Another
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
