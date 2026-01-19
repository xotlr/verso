import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: sceneMetas, error } = await supabase
      .from("SceneMeta")
      .select("*")
      .eq("screenplayId", id)

    if (error) handleSupabaseError(error, "Scene")

    const metaMap: Record<string, {
      color: string | null
      notes: string | null
      mood: string | null
      act: string | null
    }> = {}

    for (const meta of sceneMetas || []) {
      metaMap[meta.sceneId] = {
        color: meta.color,
        notes: meta.notes,
        mood: meta.mood,
        act: meta.act,
      }
    }

    return metaMap
  },
})
