import { PageLayout } from '@/components/layouts/page-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { ScreenplayListCardSkeleton } from '@/components/screenplay/screenplay-list-card';

/**
 * Loading skeleton for the series detail page.
 */
export default function SeriesDetailLoading() {
  return (
    <PageLayout>
      {/* Series header skeleton */}
      <div className="mb-6 sm:mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Actions toolbar skeleton */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Seasons section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>

        {/* Episodes grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <ScreenplayListCardSkeleton key={i} variant="compact" />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
