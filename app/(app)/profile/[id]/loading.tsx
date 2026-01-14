import { PageLayout } from '@/components/layouts/page-layout';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the user profile page.
 */
export default function ProfileLoading() {
  return (
    <PageLayout>
      {/* Profile header skeleton */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="text-center sm:text-left">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center p-4 rounded-lg border bg-card">
            <Skeleton className="h-6 w-8 mx-auto mb-1" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="mb-6">
        <div className="flex gap-4 border-b pb-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-lg border bg-card">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
