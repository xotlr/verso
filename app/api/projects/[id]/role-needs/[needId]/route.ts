import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { createServerActionClient } from "@/lib/supabase/server"

async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const supabase = await createServerActionClient()

  const result = await supabase
    .from("Project")
    .select("userId")
    .eq("id", projectId)
    .single()

  const project = result.data as { userId: string } | null
  return project?.userId === userId
}

const updateRoleNeedSchema = z.object({
  role: z.string().min(1).optional(),
  description: z.string().max(1000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  isPaid: z.boolean().optional(),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateRoleNeedSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId, needId } = params

    const isOwner = await isProjectOwner(projectId, user.id)
    if (!isOwner) {
      throw new ForbiddenError("Only project owner can update role needs")
    }

    const { data: existingRoleNeed, error: fetchError } = await supabase
      .from("ProjectRoleNeed")
      .select("id")
      .eq("id", needId)
      .eq("projectId", projectId)
      .single()

    if (fetchError?.code === "PGRST116" || !existingRoleNeed) {
      throw new NotFoundError("Role need")
    }
    if (fetchError) throw fetchError

    const { data: roleNeed, error: updateError } = await supabase
      .from("ProjectRoleNeed")
      .update(data)
      .eq("id", needId)
      .select()
      .single()

    if (updateError) throw updateError

    return roleNeed
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId, needId } = params

    const isOwner = await isProjectOwner(projectId, user.id)
    if (!isOwner) {
      throw new ForbiddenError("Only project owner can delete role needs")
    }

    const { data: existingRoleNeed, error: fetchError } = await supabase
      .from("ProjectRoleNeed")
      .select("id")
      .eq("id", needId)
      .eq("projectId", projectId)
      .single()

    if (fetchError?.code === "PGRST116" || !existingRoleNeed) {
      throw new NotFoundError("Role need")
    }
    if (fetchError) throw fetchError

    const { error: deleteError } = await supabase
      .from("ProjectRoleNeed")
      .delete()
      .eq("id", needId)

    if (deleteError) throw deleteError

    return { success: true }
  },
})
