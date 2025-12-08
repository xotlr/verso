import { prisma } from '@/lib/prisma';
import { TeamRole } from '@prisma/client';

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
