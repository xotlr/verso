import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"

const updateVersionSchema = z.object({
  label: z.string().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id, versionId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: version, error } = await supabase
      .from("ScreenplayVersion")
      .select(`
        *,
        creator:User!createdBy(id, name, image)
      `)
      .eq("id", versionId)
      .single()

    if (error?.code === "PGRST116" || !version) {
      throw new NotFoundError("Version")
    }
    if (error) throw error

    if (version.screenplayId !== id) {
      throw new NotFoundError("Version")
    }

    return version
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateVersionSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id, versionId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: version, error: updateError } = await supabase
      .from("ScreenplayVersion")
      .update({ label: data.label })
      .eq("id", versionId)
      .select()
      .single()

    if (updateError) throw updateError

    return version
  },
})

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id, versionId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: versionToRestore, error: versionError } = await supabase
      .from("ScreenplayVersion")
      .select("*")
      .eq("id", versionId)
      .single()

    if (versionError?.code === "PGRST116" || !versionToRestore) {
      throw new NotFoundError("Version")
    }
    if (versionError) throw versionError

    if (versionToRestore.screenplayId !== id) {
      throw new NotFoundError("Version")
    }

    const { data: screenplay, error: screenplayError } = await supabase
      .from("Screenplay")
      .select("*")
      .eq("id", id)
      .single()

    if (screenplayError?.code === "PGRST116" || !screenplay) {
      throw new NotFoundError("Screenplay")
    }
    if (screenplayError) throw screenplayError

    const { data: lastVersion } = await supabase
      .from("ScreenplayVersion")
      .select("versionNumber")
      .eq("screenplayId", id)
      .order("versionNumber", { ascending: false })
      .limit(1)
      .single()

    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1

    const currentWordCount = screenplay.content.split(/\s+/).filter(Boolean).length
    const currentSceneCount = (screenplay.content.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/gim) || []).length

    // Create backup version
    await supabase
      .from("ScreenplayVersion")
      .insert({
        screenplayId: id,
        content: screenplay.content,
        versionNumber,
        label: "Backup before restore",
        reason: "restore",
        wordCount: currentWordCount,
        sceneCount: currentSceneCount,
        createdBy: user.id,
      })

    // Restore the screenplay content
    const { data: updatedScreenplay, error: updateError } = await supabase
      .from("Screenplay")
      .update({ content: versionToRestore.content })
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    return {
      success: true,
      screenplay: updatedScreenplay,
      restoredFromVersion: versionToRestore.versionNumber,
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id, versionId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: version, error: fetchError } = await supabase
      .from("ScreenplayVersion")
      .select("id, screenplayId")
      .eq("id", versionId)
      .single()

    if (fetchError?.code === "PGRST116" || !version) {
      throw new NotFoundError("Version")
    }
    if (fetchError) throw fetchError

    if (version.screenplayId !== id) {
      throw new NotFoundError("Version")
    }

    const { error: deleteError } = await supabase
      .from("ScreenplayVersion")
      .delete()
      .eq("id", versionId)

    if (deleteError) throw deleteError

    return { success: true }
  },
})
