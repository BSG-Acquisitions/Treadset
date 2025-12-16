import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { TreadSetLogo } from "@/components/TreadSetLogo";
import { useValidateInviteToken } from "@/hooks/useOrganizationInvites";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  driver: "Driver",
  dispatcher: "Dispatcher",
  ops_manager: "Operations Manager",
  admin: "Administrator",
  sales: "Sales",
};

export default function Invite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: invite, isLoading: validating, error: validationError } = useValidateInviteToken(token);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Join Team – TreadSet";
  }, []);

  useEffect(() => {
    // Pre-fill email if invite has one
    if (invite?.email) {
      setEmail(invite.email);
    }
  }, [invite]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Sign up with invite token in metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            invite_token: token,
            created_as_employee: true, // Skip auto org creation
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Create user record
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert({
          auth_user_id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
        })
        .select()
        .single();

      if (userError) {
        console.error("User creation error:", userError);
        // User might already exist, try to fetch
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("auth_user_id", authData.user.id)
          .single();

        if (!existingUser) throw userError;
      }

      const userId = userData?.id || (await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single()).data?.id;

      if (!userId) throw new Error("Failed to get user ID");

      // Claim the invite token
      const { data: claimed, error: claimError } = await supabase.rpc("claim_invite_token", {
        invite_token: token,
        claiming_user_id: userId,
      });

      if (claimError) {
        console.error("Claim error:", claimError);
        throw new Error("Failed to process invitation");
      }

      if (!claimed) {
        throw new Error("This invitation is no longer valid");
      }

      toast({
        title: "Welcome to the team!",
        description: `You've joined ${invite?.organization_name} as a ${ROLE_LABELS[invite?.role || ""] || invite?.role}.`,
      });

      // Redirect to dashboard
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#1A4314]" />
          <p className="text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired invite
  if (!invite?.is_valid || validationError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              {invite?.error_message || "This invitation link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <TreadSetLogo size="xl" className="mx-auto" />
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              {invite.organization_logo ? (
                <img 
                  src={invite.organization_logo} 
                  alt={invite.organization_name || ""} 
                  className="h-10 w-10 rounded object-contain"
                />
              ) : (
                <Building2 className="h-10 w-10 text-[#1A4314]" />
              )}
            </div>
            <CardTitle className="text-xl">Join {invite.organization_name}</CardTitle>
            <CardDescription>
              You've been invited to join as a{" "}
              <span className="font-medium text-foreground">
                {ROLE_LABELS[invite.role] || invite.role}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || !!invite.email}
                  className={invite.email ? "bg-muted" : ""}
                />
                {invite.email && (
                  <p className="text-xs text-muted-foreground">
                    This invitation was sent to this email address
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#1A4314] hover:bg-[#2d5a24]" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Accept Invitation
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
                Sign in instead
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
