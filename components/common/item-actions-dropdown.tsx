'use client'

import React, { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical,
  Trash2,
  Edit3,
  Download,
  Star,
  FolderInput,
  FolderPlus,
  Unlink,
  Users,
  Pencil,
  Archive,
  Share2,
  Settings,
  FilePlus,
} from 'lucide-react'
import { RiFolder6Line } from 'react-icons/ri'
import { HiOutlineRectangleGroup } from 'react-icons/hi2'
import { cn, createMenuHandler, stopPointerPropagation } from '@/lib/utils'
import { ShareDialogEnhanced } from '@/components/share/share-dialog-enhanced/ShareDialogEnhanced'

export type ResourceType = 'screenplay' | 'project' | 'series'

export interface ItemActionsDropdownProps {
  // Resource info
  resourceId: string
  resourceTitle: string
  resourceType: ResourceType

  // State flags
  isFavorite?: boolean
  isArchived?: boolean
  hasProject?: boolean
  hasTeam?: boolean
  hasSeries?: boolean

  // Action handlers
  onShare?: () => void
  onEdit?: () => void
  onOpen?: () => void  // For projects: "Open Project"
  onRename?: () => void
  onExport?: () => void
  onDelete?: () => void
  onToggleFavorite?: () => void
  onMoveToProject?: () => void
  onRemoveFromProject?: () => void
  onCreateProject?: () => void
  onAddToStack?: () => void
  onNewScreenplay?: () => void  // For projects: "New Screenplay"
  onAddExistingScreenplay?: () => void  // For projects: "Add Existing Screenplay"
  onProjectSettings?: () => void  // For projects: "Project Settings"
  onMoveToTeam?: () => void
  onRemoveFromTeam?: () => void
  onArchive?: () => void

  // Optional props
  className?: string
  align?: 'start' | 'end'
}

// Configuration: which actions are available for each resource type
const ACTION_CONFIG = {
  screenplay: {
    share: true,
    edit: true,
    open: false,
    rename: true,
    export: true,
    favorite: true,
    moveToProject: true,
    removeFromProject: true,
    createProject: true,
    addToStack: true,
    newScreenplay: false,
    addExistingScreenplay: false,
    projectSettings: false,
    moveToTeam: true,
    removeFromTeam: true,
    archive: true,
    delete: true,
  },
  project: {
    share: true,
    edit: false,
    open: true,
    rename: true,
    export: false,
    favorite: true,
    moveToProject: false,
    removeFromProject: false,
    createProject: false,
    addToStack: false,
    newScreenplay: true,
    addExistingScreenplay: true,
    projectSettings: true,
    moveToTeam: true,
    removeFromTeam: true,
    archive: true,
    delete: true,
  },
  series: {
    share: true,
    edit: true,
    open: false,
    rename: true,
    export: false,
    favorite: true,
    moveToProject: true,
    removeFromProject: true,
    createProject: false,
    addToStack: false,
    newScreenplay: false,
    addExistingScreenplay: false,
    projectSettings: false,
    moveToTeam: false,
    removeFromTeam: false,
    archive: true,
    delete: true,
  },
} as const

export function ItemActionsDropdown({
  resourceId,
  resourceTitle,
  resourceType,
  isFavorite = false,
  isArchived = false,
  hasProject = false,
  hasTeam = false,
  onShare,
  onEdit,
  onOpen,
  onRename,
  onExport,
  onDelete,
  onToggleFavorite,
  onMoveToProject,
  onRemoveFromProject,
  onCreateProject,
  onAddToStack,
  onNewScreenplay,
  onAddExistingScreenplay,
  onProjectSettings,
  onMoveToTeam,
  onRemoveFromTeam,
  onArchive,
  className,
  align = 'end',
}: ItemActionsDropdownProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  const config = ACTION_CONFIG[resourceType]

  // Helper to check if an action should be shown
  const canShow = (action: keyof typeof config, handler?: () => void) => {
    return config[action] && handler !== undefined
  }

  const hasAnyActions = [
    onShare,
    onEdit,
    onOpen,
    onRename,
    onExport,
    onToggleFavorite,
    onMoveToProject,
    onRemoveFromProject,
    onCreateProject,
    onAddToStack,
    onNewScreenplay,
    onAddExistingScreenplay,
    onProjectSettings,
    onMoveToTeam,
    onRemoveFromTeam,
    onArchive,
    onDelete,
  ].some(Boolean)

  if (!hasAnyActions) return null

  const handleShareClick = () => {
    if (onShare) {
      onShare()
    } else {
      // Default: open share dialog
      setShareDialogOpen(true)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={createMenuHandler()}
            onPointerDown={stopPointerPropagation}
            className={cn('card-action-btn', className)}
            aria-label="More options"
          >
            <MoreVertical className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          {/* Group 1: Primary Actions */}
          {canShow('open', onOpen) && (
            <DropdownMenuItem onClick={createMenuHandler(onOpen)}>
              <RiFolder6Line className="mr-2 h-4 w-4" />
              Open Project
            </DropdownMenuItem>
          )}
          {canShow('edit', onEdit) && (
            <DropdownMenuItem onClick={createMenuHandler(onEdit)}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {canShow('rename', onRename) && (
            <DropdownMenuItem onClick={createMenuHandler(onRename)}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
          )}
          {canShow('favorite', onToggleFavorite) && (
            <DropdownMenuItem onClick={createMenuHandler(onToggleFavorite)}>
              <Star className={cn('mr-2 h-4 w-4', isFavorite && 'fill-current')} />
              {isFavorite ? 'Unfavorite' : 'Favorite'}
            </DropdownMenuItem>
          )}

          {/* Separator after primary actions if we have sharing/operations */}
          {(canShow('share', handleShareClick) ||
            canShow('newScreenplay', onNewScreenplay) ||
            canShow('addExistingScreenplay', onAddExistingScreenplay) ||
            canShow('moveToProject', onMoveToProject) ||
            canShow('export', onExport)) && <DropdownMenuSeparator />}

          {/* Group 2: Sharing & Project Actions */}
          {canShow('share', handleShareClick) && (
            <DropdownMenuItem onClick={createMenuHandler(handleShareClick)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
          )}
          {canShow('newScreenplay', onNewScreenplay) && (
            <DropdownMenuItem onClick={createMenuHandler(onNewScreenplay)}>
              <FilePlus className="mr-2 h-4 w-4" />
              New Screenplay
            </DropdownMenuItem>
          )}
          {canShow('addExistingScreenplay', onAddExistingScreenplay) && (
            <DropdownMenuItem onClick={createMenuHandler(onAddExistingScreenplay)}>
              <FolderInput className="mr-2 h-4 w-4" />
              Add Existing
            </DropdownMenuItem>
          )}

          {/* Separator before project settings/rename */}
          {canShow('projectSettings', onProjectSettings) && <DropdownMenuSeparator />}

          {canShow('projectSettings', onProjectSettings) && (
            <DropdownMenuItem onClick={createMenuHandler(onProjectSettings)}>
              <Settings className="mr-2 h-4 w-4" />
              Project Settings
            </DropdownMenuItem>
          )}

          {/* Group 3: Move/Organization Actions */}
          {(canShow('export', onExport) ||
            canShow('moveToProject', onMoveToProject) ||
            canShow('removeFromProject', onRemoveFromProject) ||
            canShow('createProject', onCreateProject) ||
            canShow('addToStack', onAddToStack) ||
            canShow('moveToTeam', onMoveToTeam) ||
            canShow('removeFromTeam', onRemoveFromTeam)) && !canShow('projectSettings', onProjectSettings) && (
            <DropdownMenuSeparator />
          )}

          {canShow('export', onExport) && (
            <DropdownMenuItem onClick={createMenuHandler(onExport)}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuItem>
          )}
          {canShow('moveToProject', onMoveToProject) && (
            <DropdownMenuItem onClick={createMenuHandler(onMoveToProject)}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move to Project
            </DropdownMenuItem>
          )}
          {canShow('removeFromProject', onRemoveFromProject) && hasProject && (
            <DropdownMenuItem onClick={createMenuHandler(onRemoveFromProject)}>
              <Unlink className="mr-2 h-4 w-4" />
              Unlink
            </DropdownMenuItem>
          )}
          {canShow('createProject', onCreateProject) && (
            <DropdownMenuItem onClick={createMenuHandler(onCreateProject)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Project
            </DropdownMenuItem>
          )}
          {canShow('addToStack', onAddToStack) && (
            <DropdownMenuItem onClick={createMenuHandler(onAddToStack)}>
              <HiOutlineRectangleGroup className="mr-2 h-4 w-4" />
              Add to Stack
            </DropdownMenuItem>
          )}
          {canShow('moveToTeam', onMoveToTeam) && (
            <DropdownMenuItem onClick={createMenuHandler(onMoveToTeam)}>
              <Users className="mr-2 h-4 w-4" />
              Move to Team
            </DropdownMenuItem>
          )}
          {canShow('removeFromTeam', onRemoveFromTeam) && hasTeam && (
            <DropdownMenuItem onClick={createMenuHandler(onRemoveFromTeam)}>
              <Unlink className="mr-2 h-4 w-4" />
              Remove from Team
            </DropdownMenuItem>
          )}

          {/* Group 4: Archive */}
          {canShow('archive', onArchive) && <DropdownMenuSeparator />}
          {canShow('archive', onArchive) && (
            <DropdownMenuItem onClick={createMenuHandler(onArchive)}>
              <Archive className="mr-2 h-4 w-4" />
              {isArchived ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
          )}

          {/* Group 5: Delete (destructive) */}
          {canShow('delete', onDelete) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={createMenuHandler(onDelete)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share Dialog */}
      {!onShare && (
        <ShareDialogEnhanced
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          resourceId={resourceId}
          resourceTitle={resourceTitle}
          resourceType={resourceType}
        />
      )}
    </>
  )
}
