import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { INVITE_EXPIRATION_MS } from "@/lib/constants"

type ShareRole = "VIEWER" | "COMMENTER" | "EDITOR" | "ADMIN"

interface ShareAccessResult {
  allowed: boolean
  isOwner: boolean
  series?: {
    userId: string
    projectTeamId: string | null
    owner: { id: string; name: string | null; email: string | null; image: string | null }
  }
  error?: string
  status?: number
}

async function checkShareAccess(
  seriesId: string,
  userId: string,
  supabase: any
): Promise<ShareAccessResult> {
  const { data: series, error } = await supabase
    .from("Series")
    .select(`
      userId,
      project:Project(teamId),
      user:User!userId(id, name, email, image),
      shares:SeriesShare(role)
    `)
    .eq("id", seriesId)
    .eq("shares.userId", userId)
    .single()

  if (error) handleSupabaseError(error, "Series")
  if (!series) {
    return { allowed: false, isOwner: false, error: "Series not found", status: 404 }
  }

  if (series.userId === userId) {
    return {
      allowed: true,
      isOwner: true,
      series: {
        userId: series.userId,
        projectTeamId: series.project?.teamId ?? null,
        owner: series.user,
      },
    }
  }

  const userShare = series.shares?.[0]
  if (userShare?.role === "ADMIN") {
    return {
      allowed: true,
      isOwner: false,
      series: {
        userId: series.userId,
        projectTeamId: series.project?.teamId ?? null,
        owner: series.user,
      },
    }
  }

  const teamId = series.project?.teamId
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
        series: {
          userId: series.userId,
          projectTeamId: series.project?.teamId ?? null,
          owner: series.user,
        },
      }
    }
  }

  return { allowed: false, isOwner: false, error: "Access denied", status: 403 }
}

export const GET = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const [access, sharesResult, invitesResult] = await Promise.all([
      checkShareAccess(id, user.id, supabase),
      supabase
        .from("SeriesShare")
        .select(`
          id, role, createdAt,
          user:User!userId(id, name, email, image),
          sharer:User!sharedBy(id, name)
        `)
        .eq("seriesId", id)
        .order("createdAt", { ascending: false }),
      supabase
        .from("ShareInvite")
        .select(`
          id, email, role, createdAt, expiresAt,
          inviter:User!invitedBy(id, name)
        `)
        .eq("seriesId", id)
        .gt("expiresAt", new Date().toISOString())
        .order("createdAt", { ascending: false }),
    ])

    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Series")
      throw new ForbiddenError(access.error)
    }

    return {
      owner: access.series?.owner,
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
  rateLimit: RATE_LIMITS.API,
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
          .from("SeriesShare")
          .select("id")
          .eq("seriesId", id)
          .eq("userId", targetUserId)
          .single(),
      ])

      if (!access.allowed) {
        if (access.status === 404) throw new NotFoundError("Series")
        throw new ForbiddenError(access.error)
      }

      if (targetUserResult.error) handleSupabaseError(targetUserResult.error, "User")
      if (!targetUserResult.data) throw new NotFoundError("User")

      if (existingShareResult.data) {
        throw new BadRequestError("User already has access to this series")
      }

      const { data: share, error: createError } = await supabase
        .from("SeriesShare")
        .insert({
          seriesId: id,
          userId: targetUserId,
          role: role as ShareRole,
          sharedBy: user.id,
        })
        .select(`
          id, role, createdAt,
          user:User!userId(id, name, email, image)
        `)
        .single()

      if (createError) handleSupabaseError(createError, "Share")

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
        if (access.status === 404) throw new NotFoundError("Series")
        throw new ForbiddenError(access.error)
      }

      const existingUser = existingUserResult.data

      if (existingUser) {
        const { data: existingShare } = await supabase
          .from("SeriesShare")
          .select("id")
          .eq("seriesId", id)
          .eq("userId", existingUser.id)
          .single()

        if (existingShare) {
          throw new BadRequestError("User already has access to this series")
        }

        const { data: share, error: createError } = await supabase
          .from("SeriesShare")
          .insert({
            seriesId: id,
            userId: existingUser.id,
            role: role as ShareRole,
            sharedBy: user.id,
          })
          .select(`
            id, role, createdAt,
            user:User!userId(id, name, email, image)
          `)
          .single()

        if (createError) handleSupabaseError(createError, "Share")

        return share
      }

      const { data: existingInvite } = await supabase
        .from("ShareInvite")
        .select("id")
        .eq("seriesId", id)
        .eq("email", email)
        .gt("expiresAt", new Date().toISOString())
        .single()

      if (existingInvite) {
        throw new BadRequestError("Invite already sent to this email")
      }

      const { data: invite, error: inviteError } = await supabase
        .from("ShareInvite")
        .insert({
          seriesId: id,
          email,
          role: role as ShareRole,
          invitedBy: user.id,
          expiresAt: new Date(Date.now() + INVITE_EXPIRATION_MS).toISOString(),
        })
        .select("id, email, role, token, createdAt, expiresAt")
        .single()

      if (inviteError) handleSupabaseError(inviteError, "Share")

      return {
        type: "invite",
        invite,
        message: `Invite sent to ${email}`,
      }
    }

    throw new BadRequestError("Either userId or email is required")
  },
})
