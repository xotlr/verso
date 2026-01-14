import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the shotlist page.
 */
export default function ShotlistLoading() {
  return (
    <div className="flex h-full">
      {/* Left panel - scenes list */}
      <div className="w-72 border-r bg-card/50 flex flex-col">
        <div className="h-12 border-b px-4 flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-7 w-7 rounded" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Main content - shots grid */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b px-4 flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-video rounded-lg border bg-card p-3">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
