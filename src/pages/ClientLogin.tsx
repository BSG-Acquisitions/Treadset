import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { PasswordResetDialog } from '@/components/auth/PasswordResetDialog';
import { TreadSetLogo } from '@/components/TreadSetLogo';

export default function ClientLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);
  const isClient = user ? hasRole('client') : false;
  const isStaff = user ? (hasRole('admin') || hasRole('super_admin') || hasRole('ops_manager') || hasRole('dispatcher') || hasRole('sales')) : false;

  useEffect(() => {
    document.title = "Client Portal – Sign In – TreadSet";
    if (loading) return;
    if (user && isClient && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate('/client-portal', { replace: true });
    }
  }, [user, loading, navigate, isClient]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const signInPromise = signIn(email, password);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sign in timed out')), 5000)
      );
      const result = await Promise.race([signInPromise, timeoutPromise]) as { error?: any };

      if (result?.error) {
        setError(result.error.message || 'An error occurred during sign in');
      } else {
        navigate('/client-portal');
      }
    } catch (error: any) {
      setError(error.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-4">
          <TreadSetLogo size="xl" className="mx-auto" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Client Portal</h1>
            <p className="text-muted-foreground">Sign in to view your manifests and manage pickups</p>
          </div>
        </div>
        {user && isStaff && (
          <Alert className="mb-4">
            <AlertDescription>
              You're signed in as staff.{' '}
              <Link to="/dashboard" className="text-primary hover:underline font-medium">Go to Dashboard</Link>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter the email and password you used when signing up
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-password">Password</Label>
                <Input
                  id="client-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In to Portal
              </Button>

              <div className="text-center mt-4">
                <PasswordResetDialog />
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                Need help? <Link to="/contact" className="text-primary hover:underline">Contact support</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
