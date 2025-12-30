'use client';

/**
 * Global Error Boundary
 *
 * Catches errors in the root layout and renders a full-page error UI.
 * This is the last line of defense for unhandled errors in Next.js App Router.
 *
 * Note: This component must define its own <html> and <body> tags because
 * it replaces the root layout when an error occurs.
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error('Global error caught:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-neutral-950 text-neutral-100">
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center space-y-6 max-w-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 rounded-full">
              <svg
                className="h-10 w-10 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Something went wrong</h1>
              <p className="text-neutral-400">
                An unexpected error occurred. Our team has been notified.
              </p>
            </div>

            {error.digest && (
              <p className="text-xs text-neutral-500 font-mono">
                Error ID: {error.digest}
              </p>
            )}

            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={reset}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 bg-neutral-100 text-neutral-900 hover:bg-white rounded-lg text-sm font-medium transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
