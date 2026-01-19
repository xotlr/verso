import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
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
  handler: async ({ user, params, data, supabase }) => {
    const { id: screenplayId, shotId, takeNum: takeNumStr } = params
    const takeNum = parseInt(takeNumStr, 10)

    const { data: dbUser, error: userError } = await supabase
      .from("User")
      .select("plan")
      .eq("id", user.id)
      .single()

    if (userError) throw userError

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

    const { data: existingShot, error: shotError } = await supabase
      .from("Shot")
      .select("id, takeCount")
      .eq("id", shotId)
      .eq("screenplayId", screenplayId)
      .single()

    if (shotError?.code === "PGRST116" || !existingShot) {
      throw new NotFoundError("Shot")
    }
    if (shotError) throw shotError

    if (takeNum > existingShot.takeCount) {
      throw new BadRequestError("Take number exceeds shot take count")
    }

    const { rating, notes, timecode } = data

    // Check if take note exists
    const { data: existing } = await supabase
      .from("TakeNote")
      .select("id")
      .eq("shotId", shotId)
      .eq("takeNum", takeNum)
      .single()

    let takeNote
    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("TakeNote")
        .update({
          rating,
          notes,
          timecode,
        })
        .eq("shotId", shotId)
        .eq("takeNum", takeNum)
        .select()
        .single()

      if (updateError) throw updateError
      takeNote = updated
    } else {
      const { data: created, error: createError } = await supabase
        .from("TakeNote")
        .insert({
          shotId,
          takeNum,
          rating,
          notes,
          timecode,
          createdBy: user.id,
        })
        .select()
        .single()

      if (createError) throw createError
      takeNote = created
    }

    return { takeNote }
  },
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
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

    const { data: takeNote, error } = await supabase
      .from("TakeNote")
      .select("*")
      .eq("shotId", shotId)
      .eq("takeNum", takeNum)
      .single()

    if (error && error.code !== "PGRST116") throw error

    return { takeNote: takeNote || null }
  },
})
