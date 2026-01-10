import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { canUseProduction, type PlanType } from "@/lib/stripe"

const takeNoteSchema = z.object({
  rating: z.enum(["good", "bad", "circle", "print"]).optional().nullable(),
  notes: z.string().optional().nullable(),
  timecode: z.string().optional().nullable(),
})

export const PUT = createApiHandler({
  auth: "required",
  schema: takeNoteSchema,
  handler: async ({ user, params, data }) => {
    const { id: screenplayId, shotId, takeNum: takeNumStr } = params
    const takeNum = parseInt(takeNumStr, 10)

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    })
    const plan = (dbUser?.plan as PlanType) || "FREE"

    if (!canUseProduction(plan)) {
      throw new ForbiddenError("Production features require PRO plan")
    }

    if (isNaN(takeNum) || takeNum < 1) {
      throw new BadRequestError("Invalid take number")
    }

    const access = await checkScreenplayAccess(screenplayId, user.id, "EDITOR")
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const existingShot = await prisma.shot.findFirst({
      where: {
        id: shotId,
        screenplayId,
      },
    })

    if (!existingShot) {
      throw new NotFoundError("Shot")
    }

    if (takeNum > existingShot.takeCount) {
      throw new BadRequestError("Take number exceeds shot take count")
    }

    const { rating, notes, timecode } = data

    const takeNote = await prisma.takeNote.upsert({
      where: {
        shotId_takeNum: {
          shotId,
          takeNum,
        },
      },
      update: {
        rating,
        notes,
        timecode,
      },
      create: {
        shotId,
        takeNum,
        rating,
        notes,
        timecode,
        createdBy: user.id,
      },
    })

    return { takeNote }
  },
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: screenplayId, shotId, takeNum: takeNumStr } = params
    const takeNum = parseInt(takeNumStr, 10)

    if (isNaN(takeNum) || takeNum < 1) {
      throw new BadRequestError("Invalid take number")
    }

    const access = await checkScreenplayAccess(screenplayId, user.id)
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const takeNote = await prisma.takeNote.findUnique({
      where: {
        shotId_takeNum: {
          shotId,
          takeNum,
        },
      },
    })

    return { takeNote }
  },
})
