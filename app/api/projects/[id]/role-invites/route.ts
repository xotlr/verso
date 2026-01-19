import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { hasProjectAccess } from "@/lib/project-access"

const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(supabase, projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: invites, error } = await supabase
      .from("ProjectRoleInvite")
      .select(`
        id,
        email,
        role,
        token,
        expiresAt,
        createdAt,
        inviter:User!invitedBy(
          id,
          name,
          image
        )
      `)
      .eq("projectId", projectId)
      .gt("expiresAt", new Date().toISOString())
      .order("createdAt", { ascending: false })

    if (error) handleSupabaseError(error, "Invite")

    return invites || []
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createInviteSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(supabase, projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { email, role } = data
    const normalizedEmail = email.toLowerCase()

    // Check if user already has this role
    const { data: existingRole } = await supabase
      .from("ProjectRole")
      .select(`
        id,
        user:User!userId(email)
      `)
      .eq("projectId", projectId)
      .eq("role", role)
      .not("userId", "is", null)

    if (existingRole) {
      const hasRole = existingRole.some((r: { user: { email: string } | null }) =>
        r.user?.email?.toLowerCase() === normalizedEmail
      )
      if (hasRole) {
        throw new BadRequestError("User already has this role on the project")
      }
    }

    // Check for existing invite
    const { data: existingInvite } = await supabase
      .from("ProjectRoleInvite")
      .select("id")
      .eq("projectId", projectId)
      .eq("email", normalizedEmail)
      .eq("role", role)
      .gt("expiresAt", new Date().toISOString())
      .single()

    if (existingInvite) {
      throw new BadRequestError("An invite for this email and role is already pending")
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invite, error: createError } = await supabase
      .from("ProjectRoleInvite")
      .insert({
        projectId,
        email: normalizedEmail,
        role,
        expiresAt: expiresAt.toISOString(),
        invitedBy: user.id,
      })
      .select(`
        id,
        email,
        role,
        token,
        expiresAt,
        createdAt,
        inviter:User!invitedBy(
          id,
          name,
          image
        )
      `)
      .single()

    if (createError) handleSupabaseError(createError, "Invite")

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/project-invite/${invite.token}`

    return {
      ...invite,
      inviteUrl,
    }
  },
})
