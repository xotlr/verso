import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"
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

const updateRoleSchema = z.object({
  role: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  userId: z.string().optional().nullable(),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateRoleSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId, roleId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: existingRole, error: fetchError } = await supabase
      .from("ProjectRole")
      .select("id")
      .eq("id", roleId)
      .eq("projectId", projectId)
      .single()

    if (fetchError?.code === "PGRST116" || !existingRole) {
      throw new NotFoundError("Role")
    }
    if (fetchError) throw fetchError

    const { data: updatedRole, error: updateError } = await supabase
      .from("ProjectRole")
      .update(data)
      .eq("id", roleId)
      .select(`
        *,
        user:User!userId(id, name, image)
      `)
      .single()

    if (updateError) throw updateError

    return updatedRole
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId, roleId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: existingRole, error: fetchError } = await supabase
      .from("ProjectRole")
      .select("id")
      .eq("id", roleId)
      .eq("projectId", projectId)
      .single()

    if (fetchError?.code === "PGRST116" || !existingRole) {
      throw new NotFoundError("Role")
    }
    if (fetchError) throw fetchError

    const { error: deleteError } = await supabase
      .from("ProjectRole")
      .delete()
      .eq("id", roleId)

    if (deleteError) throw deleteError

    return { success: true }
  },
})
