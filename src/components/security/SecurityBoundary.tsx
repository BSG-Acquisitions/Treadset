import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, RefreshCw } from 'lucide-react';

interface SecurityBoundaryState {
  hasSecurityError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface SecurityBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onSecurityError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class SecurityBoundary extends Component<SecurityBoundaryProps, SecurityBoundaryState> {
  constructor(props: SecurityBoundaryProps) {
    super(props);
    this.state = { hasSecurityError: false };
  }

  static getDerivedStateFromError(error: Error): SecurityBoundaryState {
    // Check if this is a security-related error
    const isSecurityError = 
      error.message.includes('unauthorized') ||
      error.message.includes('forbidden') ||
      error.message.includes('permission') ||
      error.message.includes('RLS') ||
      error.message.includes('authentication') ||
      error.message.includes('session');

    return {
      hasSecurityError: isSecurityError,
      error: isSecurityError ? error : undefined
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const isSecurityError = this.state.hasSecurityError;
    
    if (isSecurityError) {
      console.error('[Security] Security boundary caught error:', error, errorInfo);
      this.props.onSecurityError?.(error, errorInfo);
      
      // Clear potentially compromised session data
      try {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      } catch (e) {
        console.error('[Security] Failed to clear session data:', e);
      }
    }

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasSecurityError: false, error: undefined, errorInfo: undefined });
    // Force page reload for security errors
    window.location.reload();
  };

  render() {
    if (this.state.hasSecurityError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                A security error has occurred. Your session has been cleared for safety.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Button 
                onClick={this.handleRetry}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Application
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/auth'}
                className="w-full"
              >
                Return to Login
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-4 bg-muted rounded-md text-sm">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SecurityBoundary;