'use client';

export default function OfflinePage() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        {/* VERSO Logo */}
        <div className="mb-6">
          <svg
            viewBox="0 0 240 240"
            className="w-20 h-20 mx-auto text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id="vCutOffline">
                <rect width="240" height="240" rx="40" fill="white"/>
                <path d="M 50 0 L 120 190 L 190 0 Z" fill="black"/>
              </mask>
            </defs>
            <rect width="240" height="240" rx="40" fill="currentColor" mask="url(#vCutOffline)"/>
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-2">
          You&apos;re offline
        </h1>

        <p className="text-muted-foreground mb-6">
          Check your internet connection and try again. Your work is saved locally and will sync when you&apos;re back online.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
