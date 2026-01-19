import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
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
  handler: async ({ user, params, data, supabase }) => {
    const { id: screenplayId, shotId } = params

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

    const access = await checkScreenplayAccess(screenplayId, user.id, "EDITOR")
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: existingShot, error: fetchError } = await supabase
      .from("Shot")
      .select("id")
      .eq("id", shotId)
      .eq("screenplayId", screenplayId)
      .single()

    if (fetchError?.code === "PGRST116" || !existingShot) {
      throw new NotFoundError("Shot")
    }
    if (fetchError) throw fetchError

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

    const updateData: Record<string, any> = {
      status,
      statusChangedAt: new Date().toISOString(),
      statusChangedBy: user.id,
    }

    if (takeCount !== undefined) updateData.takeCount = takeCount
    if (circledTake !== undefined) updateData.circledTake = circledTake
    if (quickNotes !== undefined) updateData.quickNotes = quickNotes
    if (supervisorNotes !== undefined) updateData.supervisorNotes = supervisorNotes
    if (lineReading !== undefined) updateData.lineReading = lineReading
    if (continuityNotes !== undefined) updateData.continuityNotes = continuityNotes
    if (isFlagged !== undefined) updateData.isFlagged = isFlagged

    const { data: updatedShot, error: updateError } = await supabase
      .from("Shot")
      .update(updateData)
      .eq("id", shotId)
      .select()
      .single()

    if (updateError) throw updateError

    return { shot: updatedShot }
  },
})
