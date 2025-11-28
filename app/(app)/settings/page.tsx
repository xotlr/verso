'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SettingsContent } from '@/components/settings-content';
import { Skeleton } from '@/components/ui/skeleton';

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'visual';

  return <SettingsContent defaultTab={tab} />;
}

function SettingsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your writing experience</p>
      </div>
      <Suspense fallback={<SettingsLoading />}>
        <SettingsPageContent />
      </Suspense>
    </div>
  );
}
