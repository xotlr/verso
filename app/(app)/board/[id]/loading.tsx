import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the index cards/board page.
 */
export default function BoardLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="h-12 border-b px-4 flex items-center justify-between bg-card/30">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      </div>

      {/* Board content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex gap-6">
          {/* Act columns */}
          {[1, 2, 3].map((act) => (
            <div key={act} className="flex-shrink-0 w-80">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((card) => (
                  <div key={card} className="p-4 rounded-lg border bg-card">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-3/4 mb-3" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-12 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
