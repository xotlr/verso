import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { z } from "zod"

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  order: z.number().int().min(0).optional(),
})

/**
 * PATCH /api/screenplays/[id]/card-groups/[groupId]
 * Update a single custom card group
 */
export const PATCH = createApiHandler({
  auth: "required",
  handler: async ({ user, params, request, supabase }) => {
    const { id, groupId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    // Verify group belongs to this screenplay
    const { data: existingGroup, error: fetchError } = await supabase
      .from("CustomCardGroup")
      .select("id")
      .eq("id", groupId)
      .eq("screenplayId", id)
      .single()

    if (fetchError?.code === "PGRST116" || !existingGroup) {
      throw new NotFoundError("Custom card group")
    }
    if (fetchError) throw fetchError

    const body = await request.json()
    const data = UpdateGroupSchema.parse(body)

    const { data: updatedGroup, error: updateError } = await supabase
      .from("CustomCardGroup")
      .update(data)
      .eq("id", groupId)
      .select()
      .single()

    if (updateError) throw updateError

    return updatedGroup
  },
})

/**
 * DELETE /api/screenplays/[id]/card-groups/[groupId]
 * Delete a custom card group (sets all scenes' customGroupId to null)
 */
export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id, groupId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    // Verify group belongs to this screenplay
    const { data: existingGroup, error: fetchError } = await supabase
      .from("CustomCardGroup")
      .select("id")
      .eq("id", groupId)
      .eq("screenplayId", id)
      .single()

    if (fetchError?.code === "PGRST116" || !existingGroup) {
      throw new NotFoundError("Custom card group")
    }
    if (fetchError) throw fetchError

    // Delete the group (cascade will set customGroupId to null in SceneMeta due to onDelete: SetNull)
    const { error: deleteError } = await supabase
      .from("CustomCardGroup")
      .delete()
      .eq("id", groupId)

    if (deleteError) throw deleteError

    return { success: true }
  },
})
