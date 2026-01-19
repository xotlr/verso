import { NextResponse } from "next/server"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { DEFAULT_ACTS } from "@/types/beat-board"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const [screenplayResult, sceneMetasResult] = await Promise.all([
      supabase
        .from("Screenplay")
        .select("id, title, content, acts")
        .eq("id", id)
        .single(),
      supabase
        .from("SceneMeta")
        .select("*")
        .eq("screenplayId", id),
    ])

    if (screenplayResult.error) throw new NotFoundError("Screenplay")
    if (!screenplayResult.data) throw new NotFoundError("Screenplay")
    if (sceneMetasResult.error) throw sceneMetasResult.error

    const screenplay = screenplayResult.data
    const sceneMetas = sceneMetasResult.data || []

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
