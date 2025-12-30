'use client';

/**
 * App Section Error Boundary
 *
 * Catches errors within the authenticated app section.
 * Provides recovery options while preserving the app shell.
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, FileText, Settings } from 'lucide-react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App section error:', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  // Detect common error types for better messaging
  const isNetworkError = error.message?.toLowerCase().includes('network') ||
    error.message?.toLowerCase().includes('fetch');
  const isAuthError = error.message?.toLowerCase().includes('unauthorized') ||
    error.message?.toLowerCase().includes('auth');

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-background">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            {isAuthError
              ? 'Session expired'
              : isNetworkError
                ? 'Connection lost'
                : 'Something went wrong'}
          </h1>
          <p className="text-muted-foreground">
            {isAuthError
              ? 'Please sign in again to continue.'
              : isNetworkError
                ? 'Check your internet connection and try again.'
                : 'We hit an unexpected error. Your work has been saved locally.'}
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            Reference: {error.digest}
          </p>
        )}

        {process.env.NODE_ENV === 'development' && error.message && (
          <details className="text-left">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Technical details
            </summary>
            <pre className="mt-2 p-3 text-xs bg-muted rounded-lg overflow-auto max-h-[200px]">
              {error.message}
            </pre>
          </details>
        )}

        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          {isAuthError ? (
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link href="/home">
                  <FileText className="h-4 w-4 mr-2" />
                  My Scripts
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
