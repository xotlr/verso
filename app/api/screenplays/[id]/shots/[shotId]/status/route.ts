import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { canUseProduction, type PlanType } from "@/lib/stripe"
import { SHOT_STATUSES } from "@/types/shotlist"

const updateStatusSchema = z.object({
  status: z.enum(SHOT_STATUSES),
  takeCount: z.number().int().min(0).optional(),
  circledTake: z.number().int().min(1).optional().nullable(),
  quickNotes: z.string().optional().nullable(),
  supervisorNotes: z.string().optional().nullable(),
  lineReading: z.string().optional().nullable(),
  continuityNotes: z.string().optional().nullable(),
  isFlagged: z.boolean().optional(),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateStatusSchema,
  handler: async ({ user, params, data }) => {
    const { id: screenplayId, shotId } = params

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    })
    const plan = (dbUser?.plan as PlanType) || "FREE"

    if (!canUseProduction(plan)) {
      throw new ForbiddenError("Production features require PRO plan")
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

    const {
      status,
      takeCount,
      circledTake,
      quickNotes,
      supervisorNotes,
      lineReading,
      continuityNotes,
      isFlagged,
    } = data

    const updatedShot = await prisma.shot.update({
      where: { id: shotId },
      data: {
        status,
        ...(takeCount !== undefined && { takeCount }),
        ...(circledTake !== undefined && { circledTake }),
        ...(quickNotes !== undefined && { quickNotes }),
        ...(supervisorNotes !== undefined && { supervisorNotes }),
        ...(lineReading !== undefined && { lineReading }),
        ...(continuityNotes !== undefined && { continuityNotes }),
        ...(isFlagged !== undefined && { isFlagged }),
        statusChangedAt: new Date(),
        statusChangedBy: user.id,
      },
    })

    return { shot: updatedShot }
  },
})
