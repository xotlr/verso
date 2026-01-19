/**
 * Screenplay authorization utilities.
 * Validates user access to projects and teams for screenplay operations.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

/** Result of access validation */
export interface AccessValidationResult {
  /** Whether access is granted */
  allowed: boolean;
  /** Error message if access denied */
  error?: string;
  /** HTTP status code for error response */
  status?: number;
}

/**
 * Validates that a user has access to a project.
 * Checks both direct ownership and team membership.
 *
 * @param projectId - The project ID to check
 * @param userId - The user requesting access
 * @returns Access validation result
 */
export async function validateProjectAccess(
  projectId: string,
  userId: string
): Promise<AccessValidationResult> {
  const supabase = createServiceRoleClient();

  const projectResult = await supabase
    .from('Project')
    .select('userId, teamId')
    .eq('id', projectId)
    .single();
  const project = projectResult.data as { userId: string; teamId: string | null } | null;

  if (!project) {
    return { allowed: false, error: 'Project not found', status: 404 };
  }

  // Direct owner has access
  if (project.userId === userId) {
    return { allowed: true };
  }

  // Check team membership if project belongs to a team
  if (project.teamId) {
    const membershipResult = await supabase
      .from('TeamMember')
      .select('id')
      .eq('teamId', project.teamId)
      .eq('userId', userId)
      .single();

    if (membershipResult.data) {
      return { allowed: true };
    }
  }

  return { allowed: false, error: 'Access denied to project', status: 403 };
}

/**
 * Validates that a user is a member of a team.
 *
 * @param teamId - The team ID to check
 * @param userId - The user requesting access
 * @returns Access validation result
 */
export async function validateTeamAccess(
  teamId: string,
  userId: string
): Promise<AccessValidationResult> {
  const supabase = createServiceRoleClient();

  const membershipResult = await supabase
    .from('TeamMember')
    .select('id')
    .eq('teamId', teamId)
    .eq('userId', userId)
    .single();

  if (!membershipResult.data) {
    return { allowed: false, error: 'Access denied to team', status: 403 };
  }

  return { allowed: true };
}

/**
 * Validates access to create a screenplay in a project or team.
 * Performs both project and team checks if IDs are provided.
 *
 * @param options - Validation options
 * @returns Access validation result
 */
export async function validateScreenplayCreationAccess(options: {
  userId: string;
  projectId?: string;
  teamId?: string;
}): Promise<AccessValidationResult> {
  const { userId, projectId, teamId } = options;

  // Validate project access if projectId provided
  if (projectId) {
    const projectAccess = await validateProjectAccess(projectId, userId);
    if (!projectAccess.allowed) {
      return projectAccess;
    }
  }

  // Validate team access if teamId provided
  if (teamId) {
    const teamAccess = await validateTeamAccess(teamId, userId);
    if (!teamAccess.allowed) {
      return teamAccess;
    }
  }

  return { allowed: true };
}
