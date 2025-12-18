import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, Building2, FileText, Download, Calendar } from 'lucide-react';
import bsgLogo from '@/assets/bsg-logo.jpeg';

interface InviteData {
  id: string;
  client_id: string;
  organization_id: string;
  organization_name: string;
  organization_logo: string;
  company_name: string;
  sent_to_email: string;
  is_valid: boolean;
  error_message: string | null;
}

export default function ClientInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No invitation token provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('validate_client_invite_token', {
          invite_token: token
        });

        if (error) {
          console.error('Token validation error:', error);
          setError('Failed to validate invitation');
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const invite = data[0] as InviteData;
          setInviteData(invite);
          if (invite.sent_to_email) {
            setEmail(invite.sent_to_email);
          }
        } else {
          setError('Invalid invitation link');
        }
      } catch (err) {
        console.error('Validation error:', err);
        setError('Failed to validate invitation');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !firstName || !lastName) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/client-portal`,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else {
          toast.error(signUpError.message);
        }
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        toast.error('Failed to create account');
        setIsSubmitting(false);
        return;
      }

      // Wait a moment for the user record to be created by the trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the user's internal ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (userError || !userData) {
        console.error('Failed to get user record:', userError);
        // Still proceed - the claim function will handle it
      }

      // Claim the invite token
      if (userData) {
        const { data: claimResult, error: claimError } = await supabase.rpc('claim_client_invite_token', {
          invite_token: token,
          claiming_user_id: userData.id
        });

        if (claimError) {
          console.error('Failed to claim invite:', claimError);
          // Don't block - user is created, they can still access the portal
        }
      }

      toast.success('Account created successfully! Redirecting to your portal...');
      
      // Navigate to client portal
      setTimeout(() => {
        navigate('/client-portal');
      }, 1500);

    } catch (err: any) {
      console.error('Sign up error:', err);
      toast.error(err.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteData?.is_valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              {error || inviteData?.error_message || 'This invitation link is no longer valid.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <img 
            src={bsgLogo} 
            alt="BSG Tire Recycling" 
            className="h-20 mx-auto mb-4 rounded-lg"
          />
          <h1 className="text-2xl font-bold text-foreground">Welcome to Your Client Portal</h1>
          <p className="text-muted-foreground mt-2">
            <Building2 className="inline h-4 w-4 mr-1" />
            {inviteData.company_name}
          </p>
        </div>

        {/* Features Preview */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 text-sm">Your portal gives you access to:</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4 text-primary" />
                <span>View Manifests</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Download className="h-4 w-4 text-primary" />
                <span>Download PDFs</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Print Documents</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Schedule Pickups</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sign Up Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Sign up with any email address you prefer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  You can use any email - it doesn't have to match our records
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Access Portal'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/auth')}>
                  Sign in
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
