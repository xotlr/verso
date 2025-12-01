'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SettingsContent } from '@/components/settings-content';
import { Skeleton } from '@/components/ui/skeleton';

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'appearance';

  return <SettingsContent defaultTab={tab} />;
}

function SettingsLoading() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <Suspense fallback={<SettingsLoading />}>
        <SettingsPageContent />
      </Suspense>
    </div>
  );
}
