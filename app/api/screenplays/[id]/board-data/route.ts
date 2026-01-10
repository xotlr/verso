import { NextResponse } from "next/server"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { DEFAULT_ACTS } from "@/types/beat-board"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const [screenplay, sceneMetas] = await Promise.all([
      prisma.screenplay.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          content: true,
          acts: true,
        },
      }),
      prisma.sceneMeta.findMany({
        where: { screenplayId: id },
      }),
    ])

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    const sceneMetaMap: Record<string, {
      color: string | null
      notes: string | null
      mood: string | null
      act: string | null
    }> = {}

    for (const meta of sceneMetas) {
      sceneMetaMap[meta.sceneId] = {
        color: meta.color,
        notes: meta.notes,
        mood: meta.mood,
        act: meta.act,
      }
    }

    const response = NextResponse.json({
      screenplay: {
        id: screenplay.id,
        title: screenplay.title,
        content: screenplay.content,
        acts: screenplay.acts || DEFAULT_ACTS,
      },
      sceneMetas: sceneMetaMap,
    })

    response.headers.set("Cache-Control", "private, max-age=30")
    return response
  },
})
