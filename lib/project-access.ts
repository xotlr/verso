/**
 * Shared project access and permission utilities.
 *
 * These functions accept a Supabase client to ensure they use the same
 * RLS context as the calling handler (set by createApiHandler).
 *
 * SECURITY: Never create a new Supabase client in these functions.
 * Always pass the client from the handler context to maintain RLS integrity.
 */

import { ForbiddenError, NotFoundError } from '@/lib/api/errors'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = { from: (table: string) => any }

/**
 * Permission levels in order of increasing access.
 * null = no access
 */
export type PermissionLevel = 'viewer' | 'editor' | 'admin' | 'owner' | null

const PERMISSION_HIERARCHY: PermissionLevel[] = ['viewer', 'editor', 'admin', 'owner']

interface ProjectWithTeam {
  id: string
  userId: string
  team: {
    id: string
    members: Array<{ userId: string; role: string }>
  } | null
}

/**
 * Get a user's permission level for a project.
 *
 * Permission hierarchy:
 * - owner: Project creator (project.userId)
 * - admin: Team member with 'admin' role
 * - editor: Team member with 'editor' role
 * - viewer: Team member with 'viewer' role
 * - null: No access
 *
 * @param supabase - Supabase client from handler context
 * @param projectId - Project ID to check
 * @param userId - User ID to check permissions for
 */
export async function getProjectPermission(
  supabase: AnySupabaseClient,
  projectId: string,
  userId: string
): Promise<PermissionLevel> {
  const result = await supabase
    .from('Project')
    .select(`
      id,
      userId,
      team:Team(
        id,
        members:TeamMember(userId, role)
      )
    `)
    .eq('id', projectId)
    .single()

  const project = result.data as ProjectWithTeam | null
  if (result.error || !project) return null

  // Project owner has full access
  if (project.userId === userId) return 'owner'

  // Check team membership
  if (project.team && Array.isArray(project.team.members)) {
    const member = project.team.members.find(m => m.userId === userId)
    if (member) {
      // Map team role to permission level
      const role = member.role.toLowerCase()
      if (role === 'admin' || role === 'owner') return 'admin'
      if (role === 'editor') return 'editor'
      return 'viewer'
    }
  }

  return null
}

/**
 * Check if a user has at least the specified permission level.
 *
 * @param supabase - Supabase client from handler context
 * @param projectId - Project ID to check
 * @param userId - User ID to check permissions for
 * @param minLevel - Minimum required permission level
 * @throws ForbiddenError if user lacks required permission
 * @throws NotFoundError if project doesn't exist
 */
export async function requirePermission(
  supabase: AnySupabaseClient,
  projectId: string,
  userId: string,
  minLevel: Exclude<PermissionLevel, null>
): Promise<PermissionLevel> {
  const permission = await getProjectPermission(supabase, projectId, userId)

  if (!permission) {
    throw new NotFoundError('Project')
  }

  const userIdx = PERMISSION_HIERARCHY.indexOf(permission)
  const minIdx = PERMISSION_HIERARCHY.indexOf(minLevel)

  if (userIdx < minIdx) {
    throw new ForbiddenError(`Requires ${minLevel} permission`)
  }

  return permission
}

/**
 * Check if a user has any access to a project.
 *
 * Use this for read operations where any team member can view.
 *
 * @param supabase - Supabase client from handler context
 * @param projectId - Project ID to check
 * @param userId - User ID to check access for
 */
export async function hasProjectAccess(
  supabase: AnySupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const permission = await getProjectPermission(supabase, projectId, userId)
  return permission !== null
}

/**
 * Check if a user is the owner of a project.
 *
 * Use this for operations that only the project creator can perform.
 *
 * @param supabase - Supabase client from handler context
 * @param projectId - Project ID to check
 * @param userId - User ID to check ownership for
 */
export async function isProjectOwner(
  supabase: AnySupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const result = await supabase
    .from('Project')
    .select('userId')
    .eq('id', projectId)
    .single()

  const project = result.data as { userId: string } | null
  return project?.userId === userId
}
