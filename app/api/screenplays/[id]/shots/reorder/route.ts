import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"

const reorderSchema = z.object({
  // Array of shot IDs in the new order
  shotIds: z.array(z.string().min(1)).min(1),
  // The scene these shots belong to
  sceneId: z.string().min(1),
})

export const POST = createApiHandler({
  auth: "required",
  schema: reorderSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: screenplayId } = params
    const { shotIds, sceneId } = data

    const access = await checkScreenplayAccess(screenplayId, user.id, "EDITOR")
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    // Verify all shots exist and belong to this screenplay and scene
    const { data: existingShots, error: fetchError } = await supabase
      .from("Shot")
      .select("id")
      .eq("screenplayId", screenplayId)
      .eq("sceneId", sceneId)
      .in("id", shotIds)

    if (fetchError) handleSupabaseError(fetchError, "Shot")

    const existingIds = new Set((existingShots || []).map((s: { id: string }) => s.id))
    const missingIds = shotIds.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      throw new NotFoundError(`Shots not found: ${missingIds.join(", ")}`)
    }

    // Update shot numbers one by one (Supabase doesn't support batch updates with different values)
    for (let i = 0; i < shotIds.length; i++) {
      const { error: updateError } = await supabase
        .from("Shot")
        .update({ shotNumber: i + 1 })
        .eq("id", shotIds[i])

      if (updateError) handleSupabaseError(updateError, "Shot")
    }

    // Fetch updated shots
    const { data: updatedShots, error: resultError } = await supabase
      .from("Shot")
      .select("*")
      .eq("screenplayId", screenplayId)
      .eq("sceneId", sceneId)
      .order("shotNumber", { ascending: true })

    if (resultError) handleSupabaseError(resultError, "Shot")

    return { shots: updatedShots || [] }
  },
})
