import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError } from "@/lib/api"
import { createServerActionClient } from "@/lib/supabase/server"

const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
})

interface ProjectWithTeam {
  id: string
  userId: string
  name?: string
  team: { id: string; members: Array<{ userId: string }> } | null
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    // Check project access
    const accessSupabase = await createServerActionClient()
    const projectResult = await accessSupabase
      .from("Project")
      .select(`
        id,
        userId,
        team:Team(
          id,
          members:TeamMember(userId)
        )
      `)
      .eq("id", projectId)
      .single()

    const project = projectResult.data as ProjectWithTeam | null
    const projectError = projectResult.error

    if (projectError?.code === "PGRST116" || !project) {
      throw new NotFoundError("Project")
    }
    if (projectError) throw projectError

    const isOwner = project.userId === user.id
    const isMember = project.team && Array.isArray(project.team.members) &&
      project.team.members.some((m: { userId: string }) => m.userId === user.id)

    if (!isOwner && !isMember) {
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

    if (error) throw error

    return invites || []
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createInviteSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    // Check project access
    const accessSupabase = await createServerActionClient()
    const projectResult = await accessSupabase
      .from("Project")
      .select(`
        id,
        name,
        userId,
        team:Team(
          id,
          members:TeamMember(userId)
        )
      `)
      .eq("id", projectId)
      .single()

    const project = projectResult.data as ProjectWithTeam | null
    const projectError = projectResult.error

    if (projectError?.code === "PGRST116" || !project) {
      throw new NotFoundError("Project")
    }
    if (projectError) throw projectError

    const isOwner = project.userId === user.id
    const isMember = project.team && Array.isArray(project.team.members) &&
      project.team.members.some((m: { userId: string }) => m.userId === user.id)

    if (!isOwner && !isMember) {
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

    if (createError) throw createError

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/project-invite/${invite.token}`

    return {
      ...invite,
      inviteUrl,
    }
  },
})
