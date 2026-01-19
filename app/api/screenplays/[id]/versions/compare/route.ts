import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"

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

    const fromId = searchParams.get("from")
    const toId = searchParams.get("to")

    if (!fromId || !toId) {
      throw new BadRequestError("Both 'from' and 'to' version IDs are required")
    }

    const [fromResult, toResult] = await Promise.all([
      supabase
        .from("ScreenplayVersion")
        .select(`
          *,
          creator:User!createdBy(id, name, image)
        `)
        .eq("id", fromId)
        .single(),
      supabase
        .from("ScreenplayVersion")
        .select(`
          *,
          creator:User!createdBy(id, name, image)
        `)
        .eq("id", toId)
        .single(),
    ])

    if (fromResult.error) throw new NotFoundError("'from' version")
    if (!fromResult.data) throw new NotFoundError("'from' version")

    if (toResult.error) throw new NotFoundError("'to' version")
    if (!toResult.data) throw new NotFoundError("'to' version")

    const fromVersion = fromResult.data
    const toVersion = toResult.data

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
