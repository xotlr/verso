'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SettingsContent } from '@/components/settings-content';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLayout } from '@/components/layouts/page-layout';

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'appearance';

  return <SettingsContent defaultTab={tab} />;
}

function SettingsLoading() {
  return (
    <PageLayout narrow>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </PageLayout>
  );
}

export default function SettingsPage() {
  return (
    <PageLayout narrow>
      <Suspense fallback={<SettingsLoading />}>
        <SettingsPageContent />
      </Suspense>
    </PageLayout>
  );
}
