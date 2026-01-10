'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SeriesCard, type SeriesCardData } from './series-card';
import { useSeriesCardActions, type SeriesActionTarget } from '@/contexts/series-actions-context';

interface SeriesCardWithActionsProps {
  series: SeriesCardData & SeriesActionTarget;
  href?: string;
}

/**
 * Smart series card that automatically wires up all standard actions
 * using the SeriesActionsProvider context.
 *
 * Use this when you want automatic menu actions without manual wiring.
 * The card will have: Edit, Rename, Delete.
 */
export function SeriesCardWithActions({
  series,
  href,
}: SeriesCardWithActionsProps) {
  const router = useRouter();
  const actions = useSeriesCardActions(series);
  const linkHref = href || `/series/${series.id}`;

  // Edit navigates to the series
  const handleEdit = () => router.push(linkHref);

  return (
    <SeriesCard
      series={series}
      href={linkHref}
      onEdit={handleEdit}
      onRename={actions.onRename}
      onDelete={actions.onDelete}
    />
  );
}

export { SeriesCardWithActions as SmartSeriesCard };
