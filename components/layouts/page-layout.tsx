'use client';

import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PageLayoutProps {
  children: React.ReactNode;
  /** Page title displayed in header */
  title?: string;
  /** Page description/subtitle */
  description?: string;
  /** Action buttons/elements for the header */
  actions?: React.ReactNode;
  /** Additional class names for the container */
  className?: string;
  /** Use narrower max-width (for settings, forms) */
  narrow?: boolean;
  /** Disable default padding */
  noPadding?: boolean;
}

export function PageLayout({
  children,
  title,
  description,
  actions,
  className,
  narrow = false,
  noPadding = false,
}: PageLayoutProps) {
  const hasHeader = title || description || actions;

  return (
    <ScrollArea className="h-full bg-background">
      <div
        className={cn(
          'mx-auto',
          narrow ? 'max-w-4xl' : 'max-w-7xl',
          !noPadding && 'px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8',
          // Bottom padding: extra on mobile for floating bottom nav (h-14 at bottom-4 + safe area)
          !noPadding && 'pb-28 md:pb-16',
          className
        )}
      >
        {hasHeader && (
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="mt-1 text-sm sm:text-base text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    </ScrollArea>
  );
}
