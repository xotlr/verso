import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"

const sceneMetaSchema = z.object({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  notes: z.string().nullable().optional(),
  mood: z.string().nullable().optional(),
  act: z.string().nullable().optional(),
  customGroupId: z.string().nullable().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id, sceneId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const sceneMeta = await prisma.sceneMeta.findUnique({
      where: {
        screenplayId_sceneId: {
          screenplayId: id,
          sceneId,
        },
      },
    })

    return sceneMeta || { sceneId, color: null, notes: null, mood: null, act: null, customGroupId: null }
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: sceneMetaSchema,
  handler: async ({ user, params, data }) => {
    const { id, sceneId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { color, notes, mood, act, customGroupId } = data

    const sceneMeta = await prisma.sceneMeta.upsert({
      where: {
        screenplayId_sceneId: {
          screenplayId: id,
          sceneId,
        },
      },
      update: {
        ...(color !== undefined && { color }),
        ...(notes !== undefined && { notes }),
        ...(mood !== undefined && { mood }),
        ...(act !== undefined && { act }),
        ...(customGroupId !== undefined && { customGroupId }),
      },
      create: {
        screenplayId: id,
        sceneId,
        color: color || null,
        notes: notes || null,
        mood: mood || null,
        act: act || null,
        customGroupId: customGroupId || null,
      },
    })

    return sceneMeta
  },
})
