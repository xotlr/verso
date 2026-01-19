import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"

const sceneMetaSchema = z.object({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  notes: z.string().nullable().optional(),
  mood: z.string().nullable().optional(),
  act: z.string().nullable().optional(),
  customGroupId: z.string().nullable().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id, sceneId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: sceneMeta, error } = await supabase
      .from("SceneMeta")
      .select("*")
      .eq("screenplayId", id)
      .eq("sceneId", sceneId)
      .single()

    if (error?.code === "PGRST116" || !sceneMeta) {
      return { sceneId, color: null, notes: null, mood: null, act: null, customGroupId: null }
    }
    if (error) throw error

    return sceneMeta
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: sceneMetaSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id, sceneId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { color, notes, mood, act, customGroupId } = data

    // Check if exists
    const { data: existing } = await supabase
      .from("SceneMeta")
      .select("id")
      .eq("screenplayId", id)
      .eq("sceneId", sceneId)
      .single()

    let sceneMeta
    if (existing) {
      const updateData: Record<string, any> = {}
      if (color !== undefined) updateData.color = color
      if (notes !== undefined) updateData.notes = notes
      if (mood !== undefined) updateData.mood = mood
      if (act !== undefined) updateData.act = act
      if (customGroupId !== undefined) updateData.customGroupId = customGroupId

      const { data: updated, error: updateError } = await supabase
        .from("SceneMeta")
        .update(updateData)
        .eq("screenplayId", id)
        .eq("sceneId", sceneId)
        .select()
        .single()

      if (updateError) throw updateError
      sceneMeta = updated
    } else {
      const { data: created, error: createError } = await supabase
        .from("SceneMeta")
        .insert({
          screenplayId: id,
          sceneId,
          color: color || null,
          notes: notes || null,
          mood: mood || null,
          act: act || null,
          customGroupId: customGroupId || null,
        })
        .select()
        .single()

      if (createError) throw createError
      sceneMeta = created
    }

    return sceneMeta
  },
})
