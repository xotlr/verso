import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import {
  SHOT_TYPES,
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  SHOT_STATUSES,
} from "@/types/shotlist"

const updateShotSchema = z.object({
  sceneId: z.string().min(1).optional(),
  shotNumber: z.number().int().positive().optional(),
  description: z.string().min(1).optional(),
  shotType: z.enum(SHOT_TYPES).nullable().optional(),
  cameraAngle: z.enum(CAMERA_ANGLES).nullable().optional(),
  movement: z.enum(CAMERA_MOVEMENTS).nullable().optional(),
  duration: z.number().int().positive().nullable().optional(),
  lens: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  lighting: z.string().nullable().optional(),
  audio: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(SHOT_STATUSES).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  thumbnailType: z.enum(["upload", "url"]).nullable().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: screenplayId, shotId } = params

    const access = await checkScreenplayAccess(screenplayId, user.id)
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const shot = await prisma.shot.findUnique({
      where: { id: shotId, screenplayId },
    })

    if (!shot) {
      throw new NotFoundError("Shot")
    }

    return shot
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateShotSchema,
  handler: async ({ user, params, data }) => {
    const { id: screenplayId, shotId } = params

    const access = await checkScreenplayAccess(screenplayId, user.id, "EDITOR")
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const existingShot = await prisma.shot.findUnique({
      where: { id: shotId, screenplayId },
    })

    if (!existingShot) {
      throw new NotFoundError("Shot")
    }

    const shot = await prisma.shot.update({
      where: { id: shotId },
      data: {
        ...(data.sceneId !== undefined && { sceneId: data.sceneId }),
        ...(data.shotNumber !== undefined && { shotNumber: data.shotNumber }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.shotType !== undefined && { shotType: data.shotType }),
        ...(data.cameraAngle !== undefined && { cameraAngle: data.cameraAngle }),
        ...(data.movement !== undefined && { movement: data.movement }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.lens !== undefined && { lens: data.lens }),
        ...(data.equipment !== undefined && { equipment: data.equipment }),
        ...(data.lighting !== undefined && { lighting: data.lighting }),
        ...(data.audio !== undefined && { audio: data.audio }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        ...(data.thumbnailType !== undefined && { thumbnailType: data.thumbnailType }),
      },
    })

    return shot
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: screenplayId, shotId } = params

    const access = await checkScreenplayAccess(screenplayId, user.id, "EDITOR")
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const existingShot = await prisma.shot.findUnique({
      where: { id: shotId, screenplayId },
    })

    if (!existingShot) {
      throw new NotFoundError("Shot")
    }

    await prisma.shot.delete({
      where: { id: shotId },
    })

    return { success: true }
  },
})
