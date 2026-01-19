import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, handleSupabaseError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { validateImageUrl } from "@/lib/file-validation"
import { logger } from "@/lib/logger"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id, sceneId } = params

    const access = await checkScreenplayAccess(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    const { data: attachments, error } = await supabase
      .from("SceneAttachment")
      .select("*")
      .eq("screenplayId", id)
      .eq("sceneId", sceneId)
      .order("displayOrder", { ascending: true })

    if (error) handleSupabaseError(error, "Attachment")

    return attachments || []
  },
})

const createAttachmentSchema = z.object({
  type: z.enum(["image", "reference", "moodboard"]),
  url: z.string().url(),
  filename: z.string().optional(),
  caption: z.string().optional(),
})

export const POST = createApiHandler({
  auth: "required",
  schema: createAttachmentSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id, sceneId } = params

    const access = await checkScreenplayAccess(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    try {
      validateImageUrl(data.url)
    } catch (validationError) {
      logger.security('Invalid attachment URL rejected', {
        url: data.url.substring(0, 100),
        screenplayId: id,
        sceneId,
        userId: user.id,
      })
      throw new BadRequestError((validationError as Error).message)
    }

    const { count, error: countError } = await supabase
      .from("SceneAttachment")
      .select("id", { count: "exact", head: true })
      .eq("screenplayId", id)
      .eq("sceneId", sceneId)

    if (countError) handleSupabaseError(countError, "Attachment")

    if ((count || 0) >= 10) {
      throw new BadRequestError("Maximum 10 attachments per scene")
    }

    const { data: lastAttachment } = await supabase
      .from("SceneAttachment")
      .select("displayOrder")
      .eq("screenplayId", id)
      .eq("sceneId", sceneId)
      .order("displayOrder", { ascending: false })
      .limit(1)
      .single()

    const displayOrder = (lastAttachment?.displayOrder ?? -1) + 1

    const { data: attachment, error: createError } = await supabase
      .from("SceneAttachment")
      .insert({
        screenplayId: id,
        sceneId,
        type: data.type,
        url: data.url,
        filename: data.filename,
        caption: data.caption,
        displayOrder,
      })
      .select()
      .single()

    if (createError) handleSupabaseError(createError, "Attachment")

    logger.audit('create', 'sceneAttachment', attachment.id, {
      screenplayId: id,
      sceneId,
      type: data.type,
    })

    return attachment
  },
})
