import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { logger } from "@/lib/logger"

const updateAttachmentSchema = z.object({
  caption: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateAttachmentSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id, attachmentId } = params

    const access = await checkScreenplayAccess(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    const { data: attachment, error: fetchError } = await supabase
      .from("SceneAttachment")
      .select("id, screenplayId")
      .eq("id", attachmentId)
      .single()

    if (fetchError?.code === "PGRST116" || !attachment) {
      throw new NotFoundError("Attachment")
    }
    if (fetchError) handleSupabaseError(fetchError, "Attachment")

    if (attachment.screenplayId !== id) {
      throw new NotFoundError("Attachment")
    }

    const updateData: Record<string, unknown> = {}
    if (data.caption !== undefined) updateData.caption = data.caption
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder

    const { data: updated, error: updateError } = await supabase
      .from("SceneAttachment")
      .update(updateData)
      .eq("id", attachmentId)
      .select()
      .single()

    if (updateError) handleSupabaseError(updateError, "Attachment")

    logger.audit('update', 'sceneAttachment', attachmentId, {
      screenplayId: id,
      fields: Object.keys(data),
    })

    return updated
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id, attachmentId } = params

    const access = await checkScreenplayAccess(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    const { data: attachment, error: fetchError } = await supabase
      .from("SceneAttachment")
      .select("id, screenplayId, sceneId")
      .eq("id", attachmentId)
      .single()

    if (fetchError?.code === "PGRST116" || !attachment) {
      throw new NotFoundError("Attachment")
    }
    if (fetchError) handleSupabaseError(fetchError, "Attachment")

    if (attachment.screenplayId !== id) {
      throw new NotFoundError("Attachment")
    }

    const { error: deleteError } = await supabase
      .from("SceneAttachment")
      .delete()
      .eq("id", attachmentId)

    if (deleteError) handleSupabaseError(deleteError, "Attachment")

    logger.audit('delete', 'sceneAttachment', attachmentId, {
      screenplayId: id,
      sceneId: attachment.sceneId,
    })

    return { success: true }
  },
})
