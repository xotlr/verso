import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { REVISION_COLORS } from "@/types/version"

const createVersionSchema = z.object({
  content: z.string(),
  reason: z.enum(["manual", "auto", "interval", "restore"]),
  label: z.string().optional(),
  message: z.string().optional(),
  wordCount: z.number().int().min(0),
  sceneCount: z.number().int().min(0),
})

function calculateChangeStats(
  newContent: string,
  newWordCount: number,
  newSceneCount: number,
  previousContent: string | null,
  previousWordCount: number | null,
  previousSceneCount: number | null
) {
  if (!previousContent || previousWordCount === null || previousSceneCount === null) {
    return null
  }

  const wordsAdded = Math.max(0, newWordCount - previousWordCount)
  const wordsRemoved = Math.max(0, previousWordCount - newWordCount)
  const scenesAdded = Math.max(0, newSceneCount - previousSceneCount)
  const scenesRemoved = Math.max(0, previousSceneCount - newSceneCount)

  return {
    wordsAdded,
    wordsRemoved,
    scenesAdded,
    scenesRemoved,
  }
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, searchParams, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    const [versionsResult, countResult] = await Promise.all([
      supabase
        .from("ScreenplayVersion")
        .select(`
          *,
          creator:User!createdBy(id, name, image)
        `)
        .eq("screenplayId", id)
        .order("createdAt", { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from("ScreenplayVersion")
        .select("*", { count: "exact", head: true })
        .eq("screenplayId", id),
    ])

    if (versionsResult.error) throw versionsResult.error

    const total = countResult.count || 0

    return {
      versions: versionsResult.data || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createVersionSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { content, reason, label, message, wordCount, sceneCount } = data

    const { data: lastVersion } = await supabase
      .from("ScreenplayVersion")
      .select("versionNumber, content, wordCount, sceneCount")
      .eq("screenplayId", id)
      .order("versionNumber", { ascending: false })
      .limit(1)
      .single()

    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1

    const revisionColorIndex = (versionNumber - 1) % REVISION_COLORS.length
    const revisionColor = REVISION_COLORS[revisionColorIndex]

    const changeStats = calculateChangeStats(
      content,
      wordCount,
      sceneCount,
      lastVersion?.content ?? null,
      lastVersion?.wordCount ?? null,
      lastVersion?.sceneCount ?? null
    )

    const { data: version, error: createError } = await supabase
      .from("ScreenplayVersion")
      .insert({
        screenplayId: id,
        content,
        versionNumber,
        label,
        message,
        reason,
        revisionColor,
        wordCount,
        sceneCount,
        ...(changeStats ? { changeStats } : {}),
        createdBy: user.id,
      })
      .select(`
        *,
        creator:User!createdBy(id, name, image)
      `)
      .single()

    if (createError) handleSupabaseError(createError, "Version")

    return version
  },
})
