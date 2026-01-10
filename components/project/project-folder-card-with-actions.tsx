'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProjectFolderCard, type ProjectFolderCardData } from './project-folder-card';
import { ProjectListRow } from './project-list-row';
import { useProjectCardActions, type ProjectActionTarget } from '@/contexts/project-actions-context';

interface ProjectFolderCardWithActionsProps {
  project: ProjectFolderCardData & ProjectActionTarget;
  variant?: 'card' | 'row';
  href?: string;
  // Optional overrides for specific actions
  onOpen?: () => void;
  onNewScreenplay?: () => void;
  onAddExistingScreenplay?: () => void;
  onRename?: () => void;
  onSettings?: () => void;
}

/**
 * Smart project card that automatically wires up team actions
 * using the ProjectActionsProvider context.
 *
 * Use this when you want automatic menu actions without manual wiring.
 * The card will have: Open, New Screenplay, Add Existing, Rename, Settings,
 * Move to Team, Remove from Team, Delete.
 */
export function ProjectFolderCardWithActions({
  project,
  variant = 'card',
  href,
  onOpen,
  onNewScreenplay,
  onAddExistingScreenplay,
  onRename,
  onSettings,
}: ProjectFolderCardWithActionsProps) {
  const router = useRouter();
  const actions = useProjectCardActions(project);
  const linkHref = href || `/project/${project.id}`;

  // Default handlers if not provided
  const handleOpen = onOpen || (() => router.push(linkHref));

  if (variant === 'row') {
    return (
      <ProjectListRow
        project={project}
        href={linkHref}
        onOpen={handleOpen}
        onNewScreenplay={onNewScreenplay}
        onAddExistingScreenplay={onAddExistingScreenplay}
        onRename={onRename}
        onSettings={onSettings}
        onMoveToTeam={actions.onMoveToTeam}
        onRemoveFromTeam={actions.onRemoveFromTeam}
        onDelete={actions.onDelete}
      />
    );
  }

  return (
    <ProjectFolderCard
      project={project}
      href={linkHref}
      onOpen={handleOpen}
      onNewScreenplay={onNewScreenplay}
      onAddExistingScreenplay={onAddExistingScreenplay}
      onRename={onRename}
      onSettings={onSettings}
      onMoveToTeam={actions.onMoveToTeam}
      onRemoveFromTeam={actions.onRemoveFromTeam}
      onDelete={actions.onDelete}
    />
  );
}

export { ProjectFolderCardWithActions as SmartProjectCard };
