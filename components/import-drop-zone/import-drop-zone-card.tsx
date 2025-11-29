'use client';

/**
 * ImportDropZoneCard - Dashboard Card Variant
 *
 * A card-style import zone for the dashboard/home page.
 */

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ImportDropZone } from './import-drop-zone';
import { ImportDropZoneProps } from './types';

interface ImportDropZoneCardProps extends ImportDropZoneProps {
  /** Make the card blend with screenplay cards */
  asScreenplayCard?: boolean;
}

export function ImportDropZoneCard({
  className,
  asScreenplayCard = true,
  ...props
}: ImportDropZoneCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden',
        asScreenplayCard && 'min-h-[180px]',
        className
      )}
    >
      <CardContent className="p-0 h-full">
        <ImportDropZone
          {...props}
          context="dashboard"
          className={cn(
            'h-full min-h-[180px] rounded-none border-0',
            'hover:bg-muted/30'
          )}
        />
      </CardContent>
    </Card>
  );
}
