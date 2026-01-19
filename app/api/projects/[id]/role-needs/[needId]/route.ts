import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { isProjectOwner } from "@/lib/project-access"

const updateRoleNeedSchema = z.object({
  role: z.string().min(1).optional(),
  description: z.string().max(1000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  isPaid: z.boolean().optional(),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateRoleNeedSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId, needId } = params

    const isOwner = await isProjectOwner(supabase, projectId, user.id)
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
    if (fetchError) handleSupabaseError(fetchError, "RoleNeed")

    const { data: roleNeed, error: updateError } = await supabase
      .from("ProjectRoleNeed")
      .update(data)
      .eq("id", needId)
      .select()
      .single()

    if (updateError) handleSupabaseError(updateError, "RoleNeed")

    return roleNeed
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, supabase }) => {
    const { id: projectId, needId } = params

    const isOwner = await isProjectOwner(supabase, projectId, user.id)
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
    if (fetchError) handleSupabaseError(fetchError, "RoleNeed")

    const { error: deleteError } = await supabase
      .from("ProjectRoleNeed")
      .delete()
      .eq("id", needId)

    if (deleteError) handleSupabaseError(deleteError, "RoleNeed")

    return { success: true }
  },
})
