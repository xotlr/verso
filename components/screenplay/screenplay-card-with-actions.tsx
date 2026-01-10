'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ScreenplayListCard, type ScreenplayListCardData } from './screenplay-list-card';
import { ScreenplayListRow } from './screenplay-list-row';
import { useScreenplayCardActions, type ScreenplayActionTarget } from '@/contexts/screenplay-actions-context';

interface ScreenplayCardWithActionsProps {
  screenplay: ScreenplayListCardData & ScreenplayActionTarget;
  variant?: 'card' | 'row';
  href?: string;
  showFavorite?: boolean;
  showGenre?: boolean;
  showProject?: boolean;
  showTeam?: boolean;
  showWordCount?: boolean;
  showType?: boolean;
  // Optional overrides for specific actions
  onAddToStack?: () => void;
}

/**
 * Smart screenplay card that automatically wires up all standard actions
 * using the ScreenplayActionsProvider context.
 *
 * Use this when you want automatic menu actions without manual wiring.
 * The card will have: Edit, Rename, Export, Favorite, Delete, Move to Project,
 * Remove from Project, Create Project, Move to Team, Remove from Team.
 */
export function ScreenplayCardWithActions({
  screenplay,
  variant = 'card',
  href,
  showFavorite = true,
  showGenre = true,
  showProject = true,
  showTeam = true,
  showWordCount = true,
  showType = true,
  onAddToStack,
}: ScreenplayCardWithActionsProps) {
  const router = useRouter();
  const actions = useScreenplayCardActions(screenplay);
  const linkHref = href || `/screenplay/${screenplay.id}`;

  // Edit navigates to the screenplay
  const handleEdit = () => router.push(linkHref);

  if (variant === 'row') {
    return (
      <ScreenplayListRow
        screenplay={screenplay}
        href={linkHref}
        onEdit={handleEdit}
        onRename={actions.onRename}
        onExport={actions.onExport}
        onToggleFavorite={actions.onToggleFavorite}
        onDelete={actions.onDelete}
        onMoveToProject={actions.onMoveToProject}
        onRemoveFromProject={actions.onRemoveFromProject}
        onCreateProject={actions.onCreateProject}
        onMoveToTeam={actions.onMoveToTeam}
        onRemoveFromTeam={actions.onRemoveFromTeam}
        onAddToStack={onAddToStack}
      />
    );
  }

  return (
    <ScreenplayListCard
      screenplay={screenplay}
      href={linkHref}
      showFavorite={showFavorite}
      showGenre={showGenre}
      showProject={showProject}
      showTeam={showTeam}
      showWordCount={showWordCount}
      showType={showType}
      onEdit={handleEdit}
      onRename={actions.onRename}
      onExport={actions.onExport}
      onToggleFavorite={actions.onToggleFavorite}
      onDelete={actions.onDelete}
      onMoveToProject={actions.onMoveToProject}
      onRemoveFromProject={actions.onRemoveFromProject}
      onCreateProject={actions.onCreateProject}
      onMoveToTeam={actions.onMoveToTeam}
      onRemoveFromTeam={actions.onRemoveFromTeam}
      onAddToStack={onAddToStack}
    />
  );
}

/**
 * Smart draggable screenplay card for use in DnD contexts.
 * Combines DraggableScreenplayCard with automatic actions.
 */
export { ScreenplayCardWithActions as SmartScreenplayCard };
