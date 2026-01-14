import { PageLayout } from '@/components/layouts/page-layout';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the teams list page.
 */
export default function TeamsLoading() {
  return (
    <PageLayout>
      {/* Header skeleton */}
      <div className="mb-6 sm:mb-8">
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Toolbar skeleton */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Teams grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
