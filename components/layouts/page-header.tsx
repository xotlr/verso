'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Back navigation href */
  backHref: string;
  /** Back button label (default: "Back to Editor") */
  backLabel?: string;
  /** Stats displayed on the right side */
  stats?: React.ReactNode;
  /** Additional action buttons */
  actions?: React.ReactNode;
}

/**
 * Shared header component for full-page views (Shotlist, Beat Board, Story Graph, Index Cards).
 * Provides consistent back navigation, title, description, and stats layout.
 */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel = 'Back to Editor',
  stats,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Back button row */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Link>
        </Button>
        {actions}
      </div>

      {/* Title and stats row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {stats && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {stats}
          </div>
        )}
      </div>
    </div>
  );
}
