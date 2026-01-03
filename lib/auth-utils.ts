import { prisma } from '@/lib/prisma';
import { TeamRole, Screenplay } from '@prisma/client';
import { cache } from 'react';

// Share role hierarchy (from least to most permissions)
export type ShareRole = 'VIEWER' | 'COMMENTER' | 'EDITOR' | 'ADMIN';
const SHARE_ROLE_HIERARCHY: ShareRole[] = ['VIEWER', 'COMMENTER', 'EDITOR', 'ADMIN'];

/**
 * Result of a screenplay access check.
 */
export interface ScreenplayAccessResult {
  allowed: boolean;
  screenplay?: Screenplay & {
    project?: { teamId: string | null } | null;
    team?: { id: string } | null;
  };
  isOwner?: boolean;
  shareRole?: ShareRole;
  error?: string;
  status?: number;
}

/**
 * Check if a share role meets the minimum required role.
 */
function hasMinShareRole(userRole: ShareRole, minRole: ShareRole): boolean {
  const userIndex = SHARE_ROLE_HIERARCHY.indexOf(userRole);
  const minIndex = SHARE_ROLE_HIERARCHY.indexOf(minRole);
  return userIndex >= minIndex;
}

/**
 * Internal implementation of screenplay access check.
 * Wrapped with cache() for request-level deduplication in Server Components.
 */
async function checkScreenplayAccessImpl(
  screenplayId: string,
  userId: string,
  requiredRole: ShareRole = 'VIEWER'
): Promise<ScreenplayAccessResult> {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    include: {
      project: { select: { teamId: true } },
      team: { select: { id: true } },
    },
  });

  if (!screenplay) {
    return { allowed: false, error: 'Screenplay not found', status: 404 };
  }

  // Check if user owns it directly (owners have full access)
  if (screenplay.userId === userId) {
    return { allowed: true, screenplay, isOwner: true };
  }

  // Check team access (team members have full access)
  const teamId = screenplay.teamId || screenplay.project?.teamId;
  if (teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });

    if (membership) {
      return { allowed: true, screenplay, isOwner: false };
    }
  }

  // Check share access with role hierarchy
  const share = await prisma.screenplayShare.findUnique({
    where: {
      screenplayId_userId: { screenplayId, userId },
    },
  });

  if (share) {
    const shareRole = share.role as ShareRole;
    if (hasMinShareRole(shareRole, requiredRole)) {
      return { allowed: true, screenplay, isOwner: false, shareRole };
    } else {
      return { allowed: false, error: 'Insufficient permissions', status: 403 };
    }
  }

  return { allowed: false, error: 'Access denied', status: 403 };
}

/**
 * Check if a user has access to a screenplay.
 * Checks ownership, team membership, and share access.
 *
 * This function is memoized per-request using React's cache() function,
 * preventing duplicate database queries when called multiple times with
 * the same arguments during a single request.
 *
 * @param screenplayId - The screenplay ID to check
 * @param userId - The user ID to check access for
 * @param requiredRole - Minimum share role required (default: VIEWER)
 * @returns Access result with screenplay data if allowed
 *
 * @example
 * ```ts
 * const access = await checkScreenplayAccess(screenplayId, userId);
 * if (!access.allowed) {
 *   return NextResponse.json({ error: access.error }, { status: access.status });
 * }
 * // User has access to access.screenplay
 * ```
 */
export const checkScreenplayAccess = cache(checkScreenplayAccessImpl);

/**
 * Require screenplay access. Throws if access is denied.
 * Use this for cleaner error handling with try/catch.
 *
 * @example
 * ```ts
 * try {
 *   const { screenplay, isOwner } = await requireScreenplayAccess(id, userId, 'EDITOR');
 *   // User has at least EDITOR access
 * } catch (error) {
 *   if (error instanceof AuthorizationError) {
 *     return NextResponse.json({ error: error.message }, { status: 403 });
 *   }
 * }
 * ```
 */
export async function requireScreenplayAccess(
  screenplayId: string,
  userId: string,
  requiredRole: ShareRole = 'VIEWER'
): Promise<{ screenplay: NonNullable<ScreenplayAccessResult['screenplay']>; isOwner: boolean; shareRole?: ShareRole }> {
  const result = await checkScreenplayAccess(screenplayId, userId, requiredRole);

  if (!result.allowed || !result.screenplay) {
    const code = result.status === 404 ? 'NOT_FOUND' : 'NOT_MEMBER';
    throw new AuthorizationError(result.error || 'Access denied', code);
  }

  return {
    screenplay: result.screenplay,
    isOwner: result.isOwner ?? false,
    shareRole: result.shareRole,
  };
}

/**
 * Custom error for authorization failures.
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code: 'NOT_MEMBER' | 'INSUFFICIENT_ROLE' | 'NOT_FOUND' = 'NOT_MEMBER'
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Role hierarchy for permission checks.
 * Higher index = more permissions.
 */
const ROLE_HIERARCHY: TeamRole[] = ['MEMBER', 'ADMIN', 'OWNER'];

/**
 * Check if a role meets the minimum required role.
 */
function hasMinRole(userRole: TeamRole, minRole: TeamRole): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const minIndex = ROLE_HIERARCHY.indexOf(minRole);
  return userIndex >= minIndex;
}

/**
 * Require team membership for an action.
 * Throws AuthorizationError if user is not a member or doesn't have sufficient role.
 *
 * @example
 * ```ts
 * try {
 *   const member = await requireTeamMembership(userId, teamId, 'ADMIN');
 *   // User is at least an admin
 * } catch (error) {
 *   if (error instanceof AuthorizationError) {
 *     return NextResponse.json({ error: error.message }, { status: 403 });
 *   }
 * }
 * ```
 */
export async function requireTeamMembership(
  userId: string,
  teamId: string,
  minRole: TeamRole = 'MEMBER'
) {
  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });

  if (!member) {
    throw new AuthorizationError('Not a team member', 'NOT_MEMBER');
  }

  if (!hasMinRole(member.role, minRole)) {
    throw new AuthorizationError(
      `Insufficient permissions. Required: ${minRole}, current: ${member.role}`,
      'INSUFFICIENT_ROLE'
    );
  }

  return member;
}

/**
 * Check if user owns a team (shorthand for owner check).
 */
export async function requireTeamOwner(userId: string, teamId: string) {
  return requireTeamMembership(userId, teamId, 'OWNER');
}

/**
 * Check if user is at least an admin of a team.
 */
export async function requireTeamAdmin(userId: string, teamId: string) {
  return requireTeamMembership(userId, teamId, 'ADMIN');
}

/**
 * Get user's role in a team (or null if not a member).
 */
export async function getTeamRole(
  userId: string,
  teamId: string
): Promise<TeamRole | null> {
  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
    select: { role: true },
  });

  return member?.role ?? null;
}

/**
 * Check if user can perform an action on a team resource.
 * Returns true/false instead of throwing.
 */
export async function canAccessTeam(
  userId: string,
  teamId: string,
  minRole: TeamRole = 'MEMBER'
): Promise<boolean> {
  try {
    await requireTeamMembership(userId, teamId, minRole);
    return true;
  } catch {
    return false;
  }
}
