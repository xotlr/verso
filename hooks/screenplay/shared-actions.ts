/**
 * Shared screenplay action utilities.
 * These functions contain the core logic for screenplay actions,
 * extracted to avoid duplication between context-based and standalone hooks.
 */

import { toast } from 'sonner';

export interface ScreenplayForActions {
  id: string;
  title: string;
  isFavorite?: boolean;
  projectId?: string | null;
  teamId?: string | null;
}

/**
 * Export a screenplay as a text file download.
 */
export async function exportScreenplay(screenplay: ScreenplayForActions): Promise<boolean> {
  try {
    const response = await fetch(`/api/screenplays/${screenplay.id}`);
    if (response.ok) {
      const data = await response.json();
      const blob = new Blob([data.content || ''], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${screenplay.title}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error exporting screenplay:', error);
    toast.error('Failed to export screenplay');
    return false;
  }
}

/**
 * Toggle the favorite status of a screenplay.
 */
export async function toggleFavorite(
  screenplay: ScreenplayForActions,
  onSuccess?: () => void
): Promise<boolean> {
  try {
    const response = await fetch(`/api/screenplays/${screenplay.id}/favorite`, {
      method: 'POST',
    });
    if (response.ok) {
      toast.success(screenplay.isFavorite ? 'Removed from favorites' : 'Added to favorites');
      onSuccess?.();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error toggling favorite:', error);
    toast.error('Failed to update favorite status');
    return false;
  }
}

/**
 * Remove a screenplay from its current project.
 */
export async function removeFromProject(
  screenplay: ScreenplayForActions,
  onSuccess?: () => void
): Promise<boolean> {
  if (!screenplay.projectId) return false;

  try {
    const response = await fetch(`/api/screenplays/${screenplay.id}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: null }),
    });
    if (response.ok) {
      toast.success('Removed from project');
      onSuccess?.();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing from project:', error);
    toast.error('Failed to remove from project');
    return false;
  }
}

/**
 * Remove a screenplay from its current team.
 */
export async function removeFromTeam(
  screenplay: ScreenplayForActions,
  onSuccess?: () => void
): Promise<boolean> {
  if (!screenplay.teamId) return false;

  try {
    const response = await fetch(`/api/screenplays/${screenplay.id}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: null }),
    });
    if (response.ok) {
      toast.success('Removed from team');
      onSuccess?.();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing from team:', error);
    toast.error('Failed to remove from team');
    return false;
  }
}
