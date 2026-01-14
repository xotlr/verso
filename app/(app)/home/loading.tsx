import { PageLayout } from '@/components/layouts/page-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { ScreenplayListCardSkeleton } from '@/components/screenplay/screenplay-list-card';

/**
 * Loading skeleton for the home/dashboard page.
 */
export default function HomeLoading() {
  return (
    <PageLayout>
      {/* Header skeleton */}
      <div className="mb-6 sm:mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Quick actions / toolbar skeleton */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Recent screenplays section */}
      <div className="mb-8">
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ScreenplayListCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
