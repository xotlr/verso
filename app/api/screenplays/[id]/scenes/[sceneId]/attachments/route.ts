import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { validateImageUrl } from "@/lib/file-validation"
import { logger } from "@/lib/logger"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id, sceneId } = params

    const access = await checkScreenplayAccess(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    const attachments = await prisma.sceneAttachment.findMany({
      where: {
        screenplayId: id,
        sceneId,
      },
      orderBy: { displayOrder: "asc" },
    })

    return attachments
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
  handler: async ({ user, params, data }) => {
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

    const existingCount = await prisma.sceneAttachment.count({
      where: { screenplayId: id, sceneId },
    })

    if (existingCount >= 10) {
      throw new BadRequestError("Maximum 10 attachments per scene")
    }

    const lastAttachment = await prisma.sceneAttachment.findFirst({
      where: { screenplayId: id, sceneId },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    })

    const displayOrder = (lastAttachment?.displayOrder ?? -1) + 1

    const attachment = await prisma.sceneAttachment.create({
      data: {
        screenplayId: id,
        sceneId,
        type: data.type,
        url: data.url,
        filename: data.filename,
        caption: data.caption,
        displayOrder,
      },
    })

    logger.audit('create', 'sceneAttachment', attachment.id, {
      screenplayId: id,
      sceneId,
      type: data.type,
    })

    return attachment
  },
})
