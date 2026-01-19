import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"

const updateRolesSchema = z.object({
  roles: z.record(z.string(), z.string()),
})

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

    const { data: characterMetas, error } = await supabase
      .from("CharacterMeta")
      .select("characterName, role")
      .eq("screenplayId", id)

    if (error) handleSupabaseError(error, "Character")

    const roles: Record<string, string> = {}
    for (const meta of characterMetas || []) {
      roles[meta.characterName] = meta.role
    }

    return { roles }
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateRolesSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { roles } = data

    // Upsert each role one by one (Supabase doesn't support composite key upserts directly)
    for (const [characterName, role] of Object.entries(roles)) {
      const { data: existing } = await supabase
        .from("CharacterMeta")
        .select("id")
        .eq("screenplayId", id)
        .eq("characterName", characterName)
        .single()

      if (existing) {
        await supabase
          .from("CharacterMeta")
          .update({ role })
          .eq("screenplayId", id)
          .eq("characterName", characterName)
      } else {
        await supabase
          .from("CharacterMeta")
          .insert({
            screenplayId: id,
            characterName,
            role,
          })
      }
    }

    return { success: true, roles }
  },
})
