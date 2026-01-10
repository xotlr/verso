import { createApiHandler, NotFoundError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { createId } from "@paralleldrive/cuid2"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: screenplayId } = params

    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id: screenplayId,
        userId: user.id,
      },
      select: {
        id: true,
        timelapseEnabled: true,
        timelapseStarted: true,
        timelapseShareId: true,
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    if (!screenplay.timelapseStarted) {
      throw new BadRequestError("No timelapse recording exists for this screenplay")
    }

    const shareId = createId()

    await prisma.screenplay.update({
      where: { id: screenplayId },
      data: { timelapseShareId: shareId },
    })

    return {
      shareId,
      shareUrl: `/timelapse/${shareId}`,
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: screenplayId } = params

    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id: screenplayId,
        userId: user.id,
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    await prisma.screenplay.update({
      where: { id: screenplayId },
      data: { timelapseShareId: null },
    })

    return { success: true }
  },
})
