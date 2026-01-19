import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"

type ShareRole = "VIEWER" | "COMMENTER" | "EDITOR" | "ADMIN"

interface ShareAccessResult {
  allowed: boolean
  isOwner: boolean
  project?: {
    userId: string
    teamId: string | null
    owner: { id: string; name: string | null; email: string | null; image: string | null }
  }
  error?: string
  status?: number
}

async function checkShareAccess(
  projectId: string,
  userId: string,
  supabase: any
): Promise<ShareAccessResult> {
  const { data: project, error } = await supabase
    .from("Project")
    .select(`
      userId, teamId,
      user:User!userId(id, name, email, image),
      shares:ProjectShare(role)
    `)
    .eq("id", projectId)
    .eq("shares.userId", userId)
    .single()

  if (error?.code === "PGRST116" || !project) {
    return { allowed: false, isOwner: false, error: "Project not found", status: 404 }
  }
  if (error) throw error

  if (project.userId === userId) {
    return {
      allowed: true,
      isOwner: true,
      project: {
        userId: project.userId,
        teamId: project.teamId,
        owner: project.user,
      },
    }
  }

  const userShare = project.shares?.[0]
  if (userShare?.role === "ADMIN") {
    return {
      allowed: true,
      isOwner: false,
      project: {
        userId: project.userId,
        teamId: project.teamId,
        owner: project.user,
      },
    }
  }

  const teamId = project.teamId
  if (teamId) {
    const { data: membership } = await supabase
      .from("TeamMember")
      .select("role")
      .eq("teamId", teamId)
      .eq("userId", userId)
      .single()

    if (membership && (membership.role === "OWNER" || membership.role === "ADMIN")) {
      return {
        allowed: true,
        isOwner: false,
        project: {
          userId: project.userId,
          teamId: project.teamId,
          owner: project.user,
        },
      }
    }
  }

  return { allowed: false, isOwner: false, error: "Access denied", status: 403 }
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const [access, sharesResult, invitesResult] = await Promise.all([
      checkShareAccess(id, user.id, supabase),
      supabase
        .from("ProjectShare")
        .select(`
          id, role, createdAt,
          user:User!userId(id, name, email, image),
          sharer:User!sharedBy(id, name)
        `)
        .eq("projectId", id)
        .order("createdAt", { ascending: false }),
      supabase
        .from("ShareInvite")
        .select(`
          id, email, role, createdAt, expiresAt,
          inviter:User!invitedBy(id, name)
        `)
        .eq("projectId", id)
        .gt("expiresAt", new Date().toISOString())
        .order("createdAt", { ascending: false }),
    ])

    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Project")
      throw new ForbiddenError(access.error)
    }

    return {
      owner: access.project?.owner,
      shares: sharesResult.data || [],
      pendingInvites: invitesResult.data || [],
    }
  },
})

const createShareSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR", "ADMIN"]).default("VIEWER"),
}).refine(
  (data) => data.userId || data.email,
  { message: "Either userId or email is required" }
)

export const POST = createApiHandler({
  auth: "required",
  schema: createShareSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params
    const { userId: targetUserId, email, role } = data

    if (targetUserId) {
      const [access, targetUserResult, existingShareResult] = await Promise.all([
        checkShareAccess(id, user.id, supabase),
        supabase
          .from("User")
          .select("id, name, email, image")
          .eq("id", targetUserId)
          .single(),
        supabase
          .from("ProjectShare")
          .select("id")
          .eq("projectId", id)
          .eq("userId", targetUserId)
          .single(),
      ])

      if (!access.allowed) {
        if (access.status === 404) throw new NotFoundError("Project")
        throw new ForbiddenError(access.error)
      }

      if (targetUserResult.error?.code === "PGRST116" || !targetUserResult.data) {
        throw new NotFoundError("User")
      }

      if (existingShareResult.data) {
        throw new BadRequestError("User already has access to this project")
      }

      const { data: share, error: createError } = await supabase
        .from("ProjectShare")
        .insert({
          projectId: id,
          userId: targetUserId,
          role: role as ShareRole,
          sharedBy: user.id,
        })
        .select(`
          id, role, createdAt,
          user:User!userId(id, name, email, image)
        `)
        .single()

      if (createError) throw createError

      return share
    }

    if (email) {
      const [access, existingUserResult] = await Promise.all([
        checkShareAccess(id, user.id, supabase),
        supabase
          .from("User")
          .select("id, name, email, image")
          .eq("email", email)
          .single(),
      ])

      if (!access.allowed) {
        if (access.status === 404) throw new NotFoundError("Project")
        throw new ForbiddenError(access.error)
      }

      const existingUser = existingUserResult.data

      if (existingUser) {
        const { data: existingShare } = await supabase
          .from("ProjectShare")
          .select("id")
          .eq("projectId", id)
          .eq("userId", existingUser.id)
          .single()

        if (existingShare) {
          throw new BadRequestError("User already has access to this project")
        }

        const { data: share, error: createError } = await supabase
          .from("ProjectShare")
          .insert({
            projectId: id,
            userId: existingUser.id,
            role: role as ShareRole,
            sharedBy: user.id,
          })
          .select(`
            id, role, createdAt,
            user:User!userId(id, name, email, image)
          `)
          .single()

        if (createError) throw createError

        return share
      }

      const { data: existingInvite } = await supabase
        .from("ShareInvite")
        .select("id")
        .eq("projectId", id)
        .eq("email", email)
        .gt("expiresAt", new Date().toISOString())
        .single()

      if (existingInvite) {
        throw new BadRequestError("Invite already sent to this email")
      }

      const { data: invite, error: inviteError } = await supabase
        .from("ShareInvite")
        .insert({
          projectId: id,
          email,
          role: role as ShareRole,
          invitedBy: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id, email, role, token, createdAt, expiresAt")
        .single()

      if (inviteError) throw inviteError

      return {
        type: "invite",
        invite,
        message: `Invite sent to ${email}`,
      }
    }

    throw new BadRequestError("Either userId or email is required")
  },
})
