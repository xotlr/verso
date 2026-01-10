'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SettingsContent } from '@/components/settings-content';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLayout } from '@/components/layouts/page-layout';

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'appearance';
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch from Radix UI ID generation
  // This is a standard Next.js pattern for client-only rendering
   
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <SettingsContent defaultTab={tab} />;
}

function SettingsLoading() {
  return (
    <PageLayout>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </PageLayout>
  );
}

export default function SettingsPage() {
  return (
    <PageLayout>
      <Suspense fallback={<SettingsLoading />}>
        <SettingsPageContent />
      </Suspense>
    </PageLayout>
  );
}
