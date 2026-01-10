import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, searchParams }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const fromId = searchParams.get("from")
    const toId = searchParams.get("to")

    if (!fromId || !toId) {
      throw new BadRequestError("Both 'from' and 'to' version IDs are required")
    }

    const [fromVersion, toVersion] = await Promise.all([
      prisma.screenplayVersion.findUnique({
        where: { id: fromId },
        include: {
          creator: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.screenplayVersion.findUnique({
        where: { id: toId },
        include: {
          creator: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
    ])

    if (!fromVersion) {
      throw new NotFoundError("'from' version")
    }

    if (!toVersion) {
      throw new NotFoundError("'to' version")
    }

    if (fromVersion.screenplayId !== id || toVersion.screenplayId !== id) {
      throw new BadRequestError("Versions do not belong to this screenplay")
    }

    const wordsAdded = Math.max(0, toVersion.wordCount - fromVersion.wordCount)
    const wordsRemoved = Math.max(0, fromVersion.wordCount - toVersion.wordCount)
    const scenesAdded = Math.max(0, toVersion.sceneCount - fromVersion.sceneCount)
    const scenesRemoved = Math.max(0, fromVersion.sceneCount - toVersion.sceneCount)

    return {
      from: fromVersion,
      to: toVersion,
      diffStats: {
        wordsAdded,
        wordsRemoved,
        scenesAdded,
        scenesRemoved,
      },
    }
  },
})
