import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError, ConflictError } from "@/lib/api"
import { createServerActionClient } from "@/lib/supabase/server"

interface ProjectWithTeam {
  id: string
  userId: string
  team: { id: string; members: Array<{ userId: string }> } | null
}

async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const supabase = await createServerActionClient()

  const result = await supabase
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

  const project = result.data as ProjectWithTeam | null
  if (result.error || !project) return false
  if (project.userId === userId) return true
  if (project.team && Array.isArray(project.team.members)) {
    const isMember = project.team.members.some((m: { userId: string }) => m.userId === userId)
    if (isMember) return true
  }

  return false
}

const createRoleSchema = z.object({
  role: z.string().min(1, "Role is required"),
  name: z.string().optional(),
  userId: z.string().optional().nullable(),
  assignSelf: z.boolean().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: roles, error } = await supabase
      .from("ProjectRole")
      .select(`
        *,
        user:User!userId(id, name, image)
      `)
      .eq("projectId", projectId)
      .order("role", { ascending: true })

    if (error) throw error

    return roles || []
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createRoleSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    let finalName = data.name
    let finalUserId = data.userId

    if (data.assignSelf) {
      finalUserId = user.id
      finalName = user.name || user.email || "Me"
    } else if (data.userId && !data.name) {
      const { data: targetUser } = await supabase
        .from("User")
        .select("name, email")
        .eq("id", data.userId)
        .single()

      if (targetUser) {
        finalName = targetUser.name || targetUser.email || "Unknown"
      }
    }

    if (!finalName) {
      throw new BadRequestError("Name is required")
    }

    // Check for existing role with same name
    const { data: existing } = await supabase
      .from("ProjectRole")
      .select("id")
      .eq("projectId", projectId)
      .eq("role", data.role)
      .eq("name", finalName)
      .single()

    if (existing) {
      throw new ConflictError("This role assignment already exists")
    }

    if (finalUserId) {
      const { data: existingUserRole } = await supabase
        .from("ProjectRole")
        .select("id")
        .eq("projectId", projectId)
        .eq("role", data.role)
        .eq("userId", finalUserId)
        .single()

      if (existingUserRole) {
        throw new ConflictError("This user already has this role on the project")
      }
    }

    const { data: role, error: createError } = await supabase
      .from("ProjectRole")
      .insert({
        projectId,
        role: data.role,
        name: finalName,
        userId: finalUserId,
      })
      .select(`
        *,
        user:User!userId(id, name, image)
      `)
      .single()

    if (createError) throw createError

    return role
  },
})
