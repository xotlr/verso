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

const createShotSchema = z.object({
  sceneId: z.string().min(1, "Scene ID is required"),
  description: z.string().min(1, "Description is required"),
  shotType: z.enum(SHOT_TYPES).nullable().optional(),
  cameraAngle: z.enum(CAMERA_ANGLES).nullable().optional(),
  movement: z.enum(CAMERA_MOVEMENTS).nullable().optional(),
  duration: z.number().int().positive().nullable().optional(),
  lens: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  lighting: z.string().nullable().optional(),
  audio: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(SHOT_STATUSES).optional().default("planned"),
  thumbnailUrl: z.string().url().nullable().optional(),
  thumbnailType: z.enum(["upload", "url"]).nullable().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: screenplayId } = params

    const access = await checkScreenplayAccess(screenplayId, user.id)
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const shots = await prisma.shot.findMany({
      where: { screenplayId },
      orderBy: [
        { sceneId: "asc" },
        { shotNumber: "asc" },
      ],
    })

    return { shots }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createShotSchema,
  handler: async ({ user, params, data }) => {
    const { id: screenplayId } = params

    const access = await checkScreenplayAccess(screenplayId, user.id, "EDITOR")
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const shot = await prisma.$transaction(async (tx) => {
      const lastShot = await tx.shot.findFirst({
        where: {
          screenplayId,
          sceneId: data.sceneId,
        },
        orderBy: { shotNumber: "desc" },
        select: { shotNumber: true },
      })

      const shotNumber = (lastShot?.shotNumber ?? 0) + 1

      return tx.shot.create({
        data: {
          screenplayId,
          sceneId: data.sceneId,
          shotNumber,
          description: data.description,
          shotType: data.shotType ?? null,
          cameraAngle: data.cameraAngle ?? null,
          movement: data.movement ?? null,
          duration: data.duration ?? null,
          lens: data.lens ?? null,
          equipment: data.equipment ?? null,
          lighting: data.lighting ?? null,
          audio: data.audio ?? null,
          notes: data.notes ?? null,
          status: data.status,
          thumbnailUrl: data.thumbnailUrl ?? null,
          thumbnailType: data.thumbnailType ?? null,
        },
      })
    })

    return shot
  },
})
