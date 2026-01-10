import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { logger } from "@/lib/logger"

const updateAttachmentSchema = z.object({
  caption: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateAttachmentSchema,
  handler: async ({ user, params, data }) => {
    const { id, attachmentId } = params

    const access = await checkScreenplayAccess(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    const attachment = await prisma.sceneAttachment.findUnique({
      where: { id: attachmentId },
    })

    if (!attachment || attachment.screenplayId !== id) {
      throw new NotFoundError("Attachment")
    }

    const updated = await prisma.sceneAttachment.update({
      where: { id: attachmentId },
      data: {
        ...(data.caption !== undefined && { caption: data.caption }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      },
    })

    logger.audit('update', 'sceneAttachment', attachmentId, {
      screenplayId: id,
      fields: Object.keys(data),
    })

    return updated
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id, attachmentId } = params

    const access = await checkScreenplayAccess(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    const attachment = await prisma.sceneAttachment.findUnique({
      where: { id: attachmentId },
    })

    if (!attachment || attachment.screenplayId !== id) {
      throw new NotFoundError("Attachment")
    }

    await prisma.sceneAttachment.delete({
      where: { id: attachmentId },
    })

    logger.audit('delete', 'sceneAttachment', attachmentId, {
      screenplayId: id,
      sceneId: attachment.sceneId,
    })

    return { success: true }
  },
})
