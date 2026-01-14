import { PageLayout } from '@/components/layouts/page-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { ScreenplayListCardSkeleton } from '@/components/screenplay/screenplay-list-card';

/**
 * Loading skeleton for the project detail page.
 */
export default function ProjectLoading() {
  return (
    <PageLayout>
      {/* Project header skeleton */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start gap-4">
          {/* Project banner placeholder */}
          <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-8 w-56 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>

      {/* Actions toolbar skeleton */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>

      {/* Screenplays section */}
      <div className="mb-8">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <ScreenplayListCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
