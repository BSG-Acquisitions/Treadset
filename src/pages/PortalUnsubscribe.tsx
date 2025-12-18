import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Mail, MailX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import bsgLogo from '@/assets/bsg-logo.jpeg';

export default function PortalUnsubscribe() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'unsubscribed' | 'resubscribed' | 'error'>('loading');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const clientId = searchParams.get('client');
  const action = searchParams.get('action') || 'unsubscribe';

  useEffect(() => {
    // The edge function handles the actual unsubscribe
    // This page is just for confirmation display
    if (action === 'unsubscribe') {
      setStatus('unsubscribed');
    } else if (action === 'resubscribed') {
      setStatus('resubscribed');
    } else {
      setStatus('unsubscribed');
    }
  }, [action]);

  const handleResubscribe = async () => {
    if (!clientId) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ portal_invite_opted_out: false })
        .eq('id', clientId);

      if (error) throw error;
      
      setStatus('resubscribed');
      toast.success('You have been resubscribed to portal invitations');
    } catch (error) {
      console.error('Error resubscribing:', error);
      toast.error('Failed to resubscribe. Please contact us.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f0f7f0 0%, #e8f5e8 100%)' }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center" style={{ background: 'linear-gradient(135deg, #1A4314 0%, #2d5a1e 100%)', color: 'white', borderRadius: '0.5rem 0.5rem 0 0' }}>
          <img 
            src={bsgLogo} 
            alt="BSG Tire Recycling" 
            className="h-16 mx-auto mb-4 rounded-lg"
          />
          <CardTitle className="text-xl text-white">Email Preferences</CardTitle>
        </CardHeader>
        <CardContent className="pt-8 text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Processing your request...</p>
            </div>
          )}

          {status === 'unsubscribed' && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                <MailX className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold">Unsubscribed</h2>
              <p className="text-muted-foreground">
                You've been unsubscribed from BSG Tire Recycling portal invitation emails.
              </p>
              <div className="mt-4 pt-4 border-t w-full">
                <p className="text-sm text-muted-foreground mb-3">Changed your mind?</p>
                <Button 
                  onClick={handleResubscribe} 
                  disabled={isProcessing}
                  variant="outline"
                  className="gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Resubscribe to Emails
                </Button>
              </div>
            </div>
          )}

          {status === 'resubscribed' && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">Resubscribed!</h2>
              <p className="text-muted-foreground">
                You'll receive your next portal invitation within a few days.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold">Something Went Wrong</h2>
              <p className="text-muted-foreground">
                We couldn't process your request. Please contact us at (313) 731-0817.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
