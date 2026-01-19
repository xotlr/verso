import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"

const updateSettingsSchema = z.object({
  enabled: z.boolean().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: screenplayId } = params

    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select("id, title, timelapseEnabled, timelapseStarted, timelapseShareId")
      .eq("id", screenplayId)
      .eq("userId", user.id)
      .single()

    if (error?.code === "PGRST116" || !screenplay) {
      throw new NotFoundError("Screenplay")
    }
    if (error) throw error

    // Get operation count
    const { count: operationCount } = await supabase
      .from("ScreenplayOperation")
      .select("*", { count: "exact", head: true })
      .eq("screenplayId", screenplayId)

    // Get first and last operation timestamps
    const [firstOpResult, lastOpResult] = await Promise.all([
      supabase
        .from("ScreenplayOperation")
        .select("timestamp")
        .eq("screenplayId", screenplayId)
        .order("timestamp", { ascending: true })
        .limit(1)
        .single(),
      supabase
        .from("ScreenplayOperation")
        .select("timestamp")
        .eq("screenplayId", screenplayId)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single(),
    ])

    const firstOp = firstOpResult.data
    const lastOp = lastOpResult.data

    return {
      enabled: screenplay.timelapseEnabled,
      started: screenplay.timelapseStarted,
      shareId: screenplay.timelapseShareId,
      shareUrl: screenplay.timelapseShareId ? `/timelapse/${screenplay.timelapseShareId}` : null,
      operationCount: operationCount || 0,
      firstOperationAt: firstOp?.timestamp || null,
      lastOperationAt: lastOp?.timestamp || null,
      durationMs: firstOp && lastOp
        ? new Date(lastOp.timestamp).getTime() - new Date(firstOp.timestamp).getTime()
        : 0,
    }
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateSettingsSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: screenplayId } = params

    const { data: screenplay, error: fetchError } = await supabase
      .from("Screenplay")
      .select("id")
      .eq("id", screenplayId)
      .eq("userId", user.id)
      .single()

    if (fetchError?.code === "PGRST116" || !screenplay) {
      throw new NotFoundError("Screenplay")
    }
    if (fetchError) throw fetchError

    const { data: updated, error: updateError } = await supabase
      .from("Screenplay")
      .update({ timelapseEnabled: data.enabled })
      .eq("id", screenplayId)
      .select("timelapseEnabled, timelapseStarted, timelapseShareId")
      .single()

    if (updateError) throw updateError

    return {
      enabled: updated.timelapseEnabled,
      started: updated.timelapseStarted,
      shareId: updated.timelapseShareId,
    }
  },
})
