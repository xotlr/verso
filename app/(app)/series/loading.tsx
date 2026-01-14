import { PageLayout } from '@/components/layouts/page-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { SeriesCardSkeleton } from '@/components/series/series-card';

/**
 * Loading skeleton for the series list page.
 */
export default function SeriesLoading() {
  return (
    <PageLayout>
      {/* Header skeleton */}
      <div className="mb-6 sm:mb-8">
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Toolbar skeleton */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SeriesCardSkeleton key={i} />
        ))}
      </div>
    </PageLayout>
  );
}
