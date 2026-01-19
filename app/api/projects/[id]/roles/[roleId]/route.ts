import { z } from "zod"
import { createApiHandler, NotFoundError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { requirePermission } from "@/lib/project-access"

const updateRoleSchema = z.object({
  role: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  userId: z.string().optional().nullable(),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateRoleSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId, roleId } = params

    // Only owner can update roles
    await requirePermission(supabase, projectId, user.id, "owner")

    const { data: existingRole, error: fetchError } = await supabase
      .from("ProjectRole")
      .select("id")
      .eq("id", roleId)
      .eq("projectId", projectId)
      .single()

    if (fetchError?.code === "PGRST116" || !existingRole) {
      throw new NotFoundError("Role")
    }
    if (fetchError) handleSupabaseError(fetchError, "Role")

    const { data: updatedRole, error: updateError } = await supabase
      .from("ProjectRole")
      .update(data)
      .eq("id", roleId)
      .select(`
        *,
        user:User!userId(id, name, image)
      `)
      .single()

    if (updateError) handleSupabaseError(updateError, "Role")

    return updatedRole
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, supabase }) => {
    const { id: projectId, roleId } = params

    // Only owner can delete roles
    await requirePermission(supabase, projectId, user.id, "owner")

    const { data: existingRole, error: fetchError } = await supabase
      .from("ProjectRole")
      .select("id")
      .eq("id", roleId)
      .eq("projectId", projectId)
      .single()

    if (fetchError?.code === "PGRST116" || !existingRole) {
      throw new NotFoundError("Role")
    }
    if (fetchError) handleSupabaseError(fetchError, "Role")

    const { error: deleteError } = await supabase
      .from("ProjectRole")
      .delete()
      .eq("id", roleId)

    if (deleteError) handleSupabaseError(deleteError, "Role")

    return { success: true }
  },
})
