import { z } from "zod"
import { createApiHandler, NotFoundError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { hasProjectAccess, requirePermission } from "@/lib/project-access"

const createCallsheetSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  shootDate: z.string().datetime(),
  callTime: z.string().datetime(),
  wrapTime: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED"]).optional(),
  primaryLocation: z.string().max(255).optional().nullable(),
  data: z.any().optional(),
  weatherForecast: z.string().max(255).optional().nullable(),
  weatherTemp: z.number().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(supabase, projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: callsheets, error } = await supabase
      .from("Callsheet")
      .select("id, title, shootDate, callTime, wrapTime, status, primaryLocation, weatherForecast, weatherTemp, createdAt, updatedAt")
      .eq("projectId", projectId)
      .order("shootDate", { ascending: true })

    if (error) handleSupabaseError(error, "Callsheet")

    return callsheets
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createCallsheetSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    // Require editor permission to create callsheets
    await requirePermission(supabase, projectId, user.id, "editor")

    const { data: callsheet, error } = await supabase
      .from("Callsheet")
      .insert({
        title: data.title,
        shootDate: data.shootDate,
        callTime: data.callTime,
        wrapTime: data.wrapTime || null,
        status: data.status || "DRAFT",
        primaryLocation: data.primaryLocation,
        data: data.data,
        weatherForecast: data.weatherForecast,
        weatherTemp: data.weatherTemp,
        userId: user.id,
        projectId,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error, "Callsheet")

    return callsheet
  },
})
