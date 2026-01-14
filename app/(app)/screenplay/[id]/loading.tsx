import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the screenplay editor page.
 * Shows immediately during route transitions for instant feedback.
 */
export default function EditorLoading() {
  return (
    <div className="flex h-full w-full bg-background">
      {/* Left panel skeleton (desktop only) */}
      <div className="hidden lg:flex w-[280px] border-r flex-col bg-card/50">
        <div className="h-12 border-b px-4 flex items-center">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor toolbar skeleton - hidden on mobile (header shows instead) */}
        <div className="hidden md:flex h-10 border-b px-4 items-center justify-between bg-card/30">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
          </div>
        </div>

        {/* Script page container */}
        <div className="flex-1 flex justify-center overflow-auto py-6 md:py-8 px-4">
          <div className="w-full max-w-[8.5in]">
            {/* Script page skeleton */}
            <div className="bg-card border rounded-sm shadow-sm min-h-[11in] p-8 md:p-12">
              {/* Title block */}
              <div className="text-center mb-16">
                <Skeleton className="h-8 w-64 mx-auto mb-4" />
                <Skeleton className="h-4 w-32 mx-auto" />
              </div>

              {/* Scene heading */}
              <Skeleton className="h-4 w-48 mb-6" />

              {/* Action lines */}
              <div className="space-y-3 mb-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>

              {/* Character and dialogue */}
              <div className="ml-[2.5in] mb-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="ml-[-0.5in] mr-[0.5in] space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>

              {/* More action */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel skeleton (desktop only) */}
      <div className="hidden xl:flex w-[280px] border-l flex-col bg-card/50">
        <div className="h-12 border-b px-4 flex items-center">
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex-1 p-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg border bg-card/50">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
